import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Tone = "Professional" | "Confident" | "Friendly";

type RequestPayload = {
  resume?: string;
  jobDescription?: string;
  tone?: string;
};

const VALID_TONES: Tone[] = ["Professional", "Confident", "Friendly"];

function normalizeTone(raw: string | undefined): Tone {
  if (raw && VALID_TONES.includes(raw as Tone)) {
    return raw as Tone;
  }
  return "Professional";
}

function toneGuidance(tone: Tone): string {
  switch (tone) {
    case "Confident":
      return "Write with a direct, assured voice. Show impact without sounding arrogant. Short declarative sentences are welcome where they fit.";
    case "Friendly":
      return "Write in a warm, approachable way—conversational but still appropriate for a job application. A touch of personality is good.";
    default:
      return "Write in a clear, polished professional voice—credible and straightforward, not stiff or corporate-jargon heavy.";
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
    return NextResponse.json({ error: "Please login to generate a cover letter." }, { status: 401 });
  }

  const body = (await request.json()) as RequestPayload;
  const resume = body.resume?.trim();
  const jobDescription = body.jobDescription?.trim();
  const tone = normalizeTone(body.tone);

  if (!resume || !jobDescription) {
    return NextResponse.json({ error: "Resume and job description are required." }, { status: 400 });
  }

  const { error: ensureUsageRowError } = await supabase.from("user_usage").upsert(
    {
      user_id: user.id,
      generation_count: 0,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  if (ensureUsageRowError) {
    return NextResponse.json({ error: ensureUsageRowError.message }, { status: 500 });
  }

  const { data: usageRow, error: usageError } = await supabase
    .from("user_usage")
    .select("generation_count, is_pro")
    .eq("user_id", user.id)
    .single<{ generation_count: number; is_pro: boolean }>();

  if (usageError) {
    return NextResponse.json({ error: usageError.message }, { status: 500 });
  }

  const generationCount = usageRow?.generation_count ?? 0;
  const isPro = usageRow?.is_pro ?? false;
  const freeLimit = 3;

  if (!isPro && generationCount >= freeLimit) {
    return NextResponse.json(
      {
        error: "You've used your 3 free generations. Upgrade to Pro for unlimited access.",
        code: "FREE_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const draftPrompt = `You are an expert career coach. Write a concise, compelling cover letter tailored to the provided resume and job description.

Selected tone: ${tone}
Tone guidance: ${toneGuidance(tone)}

Resume:
${resume}

Job Description:
${jobDescription}

Requirements:
- Match the candidate's experience to the job requirements with specific details.
- Aim for 3 to 5 paragraphs.
- No placeholders or bracketed fill-ins.
- Return plain text only (no markdown, no subject line unless a letter greeting is natural).`;

  const humanizePrompt = `You are an expert editor. Rewrite the cover letter below so it reads like a real person wrote it—natural, varied, and authentic.

Keep the same selected tone: ${tone}
${toneGuidance(tone)}

Editing goals:
- Vary sentence length: mix shorter punchy sentences with a few longer ones.
- Use contractions where they sound natural (I'm, I've, you're, we'd, it's, that's, etc.).
- Remove "AI-sounding" patterns: avoid stock openers like "I am writing to express my interest", "I am excited to apply", "Furthermore", "Moreover", "Additionally" when simpler transitions work; cut filler like "leverage", "utilize", "robust", "passionate about" unless truly earned.
- Do not add new claims or facts—only rephrase what is already implied or stated.
- Keep it appropriate for a job application.
- Return plain text only.

Cover letter to rewrite:
<<<DRAFT>>>`;

  try {
    const draft = await callAnthropic(apiKey, draftPrompt, 900, 0.55);

    let coverLetter: string;
    try {
      const humanizeMessage = humanizePrompt.replace("<<<DRAFT>>>", draft);
      coverLetter = await callAnthropic(apiKey, humanizeMessage, 1000, 0.82);
    } catch {
      coverLetter = draft;
    }

    const { data: updatedUsageRow, error: updateUsageError } = await supabase
      .from("user_usage")
      .update({
        generation_count: generationCount + 1,
      })
      .eq("user_id", user.id)
      .select("generation_count")
      .single<{ generation_count: number }>();

    if (updateUsageError) {
      return NextResponse.json({ error: updateUsageError.message }, { status: 500 });
    }

    if (!updatedUsageRow) {
      return NextResponse.json({ error: "Failed to update usage count." }, { status: 500 });
    }

    return NextResponse.json({
      coverLetter,
      usageCount: updatedUsageRow.generation_count,
      freeLimit,
      isPro,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to call Anthropic API.";
    const status = message.startsWith("Anthropic API error") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
