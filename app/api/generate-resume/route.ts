import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasUnlimitedGenerations, isOverFreeLimit } from "@/lib/usage-limits";

type FormatStyle = "Classic" | "Modern" | "Minimal";

type RequestPayload = {
  experience?: string;
  jobDescription?: string;
  formatStyle?: string;
};

const VALID_STYLES: FormatStyle[] = ["Classic", "Modern", "Minimal"];

function normalizeFormatStyle(raw: string | undefined): FormatStyle {
  if (raw && VALID_STYLES.includes(raw as FormatStyle)) {
    return raw as FormatStyle;
  }
  return "Classic";
}

function formatStyleGuidance(style: FormatStyle): string {
  switch (style) {
    case "Modern":
      return `Use a modern resume layout:
- Lead with a concise, keyword-rich Professional Summary (3-4 lines).
- Work Experience entries: Job Title | Company | Dates on one line, then 3-5 bullet points starting with strong action verbs and quantified results where possible.
- Skills grouped by category (e.g., Technical, Tools, Soft Skills).
- Education at the end with degree, institution, and year.
- Clean section headers in ALL CAPS.`;
    case "Minimal":
      return `Use a minimal, streamlined resume layout:
- Brief Professional Summary (2-3 lines max).
- Work Experience: compact entries with job title, company, dates, and 2-3 focused bullet points each.
- Skills as a single comma-separated line or short list.
- Education: degree and institution only.
- No filler text. Every word should earn its place.`;
    default:
      return `Use a classic, traditional resume layout:
- Professional Summary: 3-4 sentences highlighting years of experience and core strengths.
- Work Experience: reverse chronological order. Each role shows Job Title, Company, Location, Dates, then bullet points describing responsibilities and achievements.
- Skills section with relevant hard and soft skills.
- Education section with degree, institution, graduation year.
- Standard section headers: PROFESSIONAL SUMMARY, WORK EXPERIENCE, SKILLS, EDUCATION.`;
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
    return NextResponse.json({ error: "Please login to generate a resume." }, { status: 401 });
  }

  const body = (await request.json()) as RequestPayload;
  const experience = body.experience?.trim();
  const jobDescription = body.jobDescription?.trim() ?? "";
  const formatStyle = normalizeFormatStyle(body.formatStyle);

  if (!experience) {
    return NextResponse.json({ error: "Experience details are required." }, { status: 400 });
  }

  const { error: ensureUsageRowError } = await supabase.from("user_usage").upsert(
    {
      user_id: user.id,
      generation_count: 0,
      resume_generation_count: 0,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  if (ensureUsageRowError) {
    return NextResponse.json({ error: ensureUsageRowError.message }, { status: 500 });
  }

  const { data: usageRow, error: usageError } = await supabase
    .from("user_usage")
    .select("resume_generation_count, is_pro, is_admin")
    .eq("user_id", user.id)
    .single<{ resume_generation_count: number; is_pro: boolean; is_admin: boolean }>();

  if (usageError) {
    return NextResponse.json({ error: usageError.message }, { status: 500 });
  }

  const resumeGenerationCount = usageRow?.resume_generation_count ?? 0;
  const accessFlags = {
    is_pro: usageRow?.is_pro ?? false,
    is_admin: usageRow?.is_admin ?? false,
  };
  const freeLimit = 2;

  if (isOverFreeLimit(resumeGenerationCount, freeLimit, accessFlags)) {
    return NextResponse.json(
      {
        error: "You've used your 2 free resume generations. Upgrade to Pro for unlimited access.",
        code: "FREE_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const tailoringNote = jobDescription
    ? `\nTailor the resume to match keywords and requirements from this job description:\n${jobDescription}\n`
    : "";

  const prompt = `You are an expert resume writer and ATS optimization specialist. Create a professionally formatted, ATS-friendly resume from the candidate's raw information below.

Format style: ${formatStyle}
${formatStyleGuidance(formatStyle)}
${tailoringNote}
Candidate information:
${experience}

Requirements:
- Include these sections in order: Contact Information, Professional Summary, Work Experience, Skills, Education.
- Contact info at the top: full name, email, phone, location (city/state) if available.
- Use plain text only — no markdown, no HTML, no special characters for bullets (use "•" or "-" for bullet points).
- Do not invent experience, skills, or credentials not implied by the input.
- Optimize for Applicant Tracking Systems: use standard section headers, include relevant keywords, avoid tables or columns.
- Use reverse chronological order for work experience.
- Each work entry should have clear job title, company, dates, and achievement-focused bullet points.
- Return the complete resume as plain text, ready to send to employers.`;

  try {
    const generatedResume = await callAnthropic(apiKey, prompt, 1500, 0.5);

    const { data: updatedUsageRow, error: updateUsageError } = await supabase
      .from("user_usage")
      .update({
        resume_generation_count: resumeGenerationCount + 1,
      })
      .eq("user_id", user.id)
      .select("resume_generation_count")
      .single<{ resume_generation_count: number }>();

    if (updateUsageError) {
      return NextResponse.json({ error: updateUsageError.message }, { status: 500 });
    }

    if (!updatedUsageRow) {
      return NextResponse.json({ error: "Failed to update usage count." }, { status: 500 });
    }

    return NextResponse.json({
      resume: generatedResume,
      usageCount: updatedUsageRow.resume_generation_count,
      freeLimit,
      isPro: hasUnlimitedGenerations(accessFlags),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to call Anthropic API.";
    const status = message.startsWith("Anthropic API error") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
