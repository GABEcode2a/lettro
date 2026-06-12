import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasUnlimitedGenerations, isOverFreeLimit } from "@/lib/usage-limits";

type InterviewType = "Behavioural" | "Technical" | "General";

type RequestPayload = {
  jobDescription?: string;
  cv?: string;
  interviewType?: string;
};

type InterviewQuestion = {
  question: string;
  sampleAnswer: string;
};

const VALID_TYPES: InterviewType[] = ["Behavioural", "Technical", "General"];

function normalizeInterviewType(raw: string | undefined): InterviewType {
  if (raw && VALID_TYPES.includes(raw as InterviewType)) {
    return raw as InterviewType;
  }
  return "General";
}

function interviewTypeGuidance(type: InterviewType): string {
  switch (type) {
    case "Behavioural":
      return `Focus on behavioural / competency-based questions (STAR method friendly). Ask about past experiences, teamwork, conflict, leadership, failure, and motivation. Sample answers should use concrete examples and measurable outcomes.`;
    case "Technical":
      return `Focus on role-relevant technical questions: skills, tools, problem-solving, system design or domain knowledge as appropriate to the job description. Sample answers should demonstrate structured thinking and practical expertise.`;
    default:
      return `Mix general interview questions: role fit, strengths, career goals, company interest, and a few situational questions. Keep questions accessible for a first-round interview.`;
  }
}

async function callAnthropic(
  apiKey: string,
  userMessage: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error: ${errorBody}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = data.content
    ?.filter((item) => item.type === "text" && Boolean(item.text))
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Empty model response.");
  }

  return text;
}

function parseQuestionsResponse(raw: string): InterviewQuestion[] {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse interview questions from model response.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    questions?: Array<{ question?: string; sampleAnswer?: string }>;
  };

  const questions = parsed.questions
    ?.map((item) => ({
      question: item.question?.trim() ?? "",
      sampleAnswer: item.sampleAnswer?.trim() ?? "",
    }))
    .filter((item) => item.question && item.sampleAnswer);

  if (!questions || questions.length === 0) {
    throw new Error("No valid interview questions in model response.");
  }

  return questions.slice(0, 10);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabase = createClient();

  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please login to generate interview questions." }, { status: 401 });
  }

  const body = (await request.json()) as RequestPayload;
  const jobDescription = body.jobDescription?.trim();
  const cv = body.cv?.trim() ?? "";
  const interviewType = normalizeInterviewType(body.interviewType);

  if (!jobDescription) {
    return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  }

  const { error: ensureUsageRowError } = await supabase.from("user_usage").upsert(
    {
      user_id: user.id,
      generation_count: 0,
      interview_prep_count: 0,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  if (ensureUsageRowError) {
    return NextResponse.json({ error: ensureUsageRowError.message }, { status: 500 });
  }

  const { data: usageRow, error: usageError } = await supabase
    .from("user_usage")
    .select("interview_prep_count, is_pro, is_admin")
    .eq("user_id", user.id)
    .single<{ interview_prep_count: number; is_pro: boolean; is_admin: boolean }>();

  if (usageError) {
    return NextResponse.json({ error: usageError.message }, { status: 500 });
  }

  const interviewPrepCount = usageRow?.interview_prep_count ?? 0;
  const accessFlags = {
    is_pro: usageRow?.is_pro ?? false,
    is_admin: usageRow?.is_admin ?? false,
  };
  const freeLimit = 1;

  if (isOverFreeLimit(interviewPrepCount, freeLimit, accessFlags)) {
    return NextResponse.json(
      {
        error: "You've used your 1 free interview prep sessions. Upgrade to Pro for unlimited access.",
        code: "FREE_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const cvSection = cv
    ? `\nCandidate CV / Resume:\n${cv}\n`
    : "\nNo CV provided — tailor questions to the job description and use generic but realistic sample answers.\n";

  const prompt = `You are an expert interview coach. Generate exactly 10 tailored interview questions with sample answers for a candidate preparing for a job interview.

Interview type: ${interviewType}
${interviewTypeGuidance(interviewType)}

Job Description:
${jobDescription}
${cvSection}
Requirements:
- Return valid JSON only, no markdown fences or extra text.
- Use this exact shape: {"questions":[{"question":"...","sampleAnswer":"..."}]}
- Exactly 10 questions.
- Questions must be specific to the role and company context in the job description.
- Sample answers should be 3-6 sentences, practical, and interview-ready.
- If a CV is provided, sample answers should reference plausible experience from it without inventing credentials.
- Do not use placeholders like [Company Name] — infer reasonable specifics from the job description.`;

  try {
    const rawResponse = await callAnthropic(apiKey, prompt, 4000, 0.55);
    const questions = parseQuestionsResponse(rawResponse);

    const { data: updatedUsageRow, error: updateUsageError } = await supabase
      .from("user_usage")
      .update({
        interview_prep_count: interviewPrepCount + 1,
      })
      .eq("user_id", user.id)
      .select("interview_prep_count")
      .single<{ interview_prep_count: number }>();

    if (updateUsageError) {
      return NextResponse.json({ error: updateUsageError.message }, { status: 500 });
    }

    if (!updatedUsageRow) {
      return NextResponse.json({ error: "Failed to update usage count." }, { status: 500 });
    }

    return NextResponse.json({
      questions,
      usageCount: updatedUsageRow.interview_prep_count,
      freeLimit,
      isPro: hasUnlimitedGenerations(accessFlags),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to call Anthropic API.";
    const status = message.startsWith("Anthropic API error") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
