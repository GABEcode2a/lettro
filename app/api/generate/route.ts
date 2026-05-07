import { NextRequest, NextResponse } from "next/server";

type RequestPayload = {
  resume?: string;
  jobDescription?: string;
  tone?: "Professional" | "Friendly" | "Confident";
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as RequestPayload;
  const resume = body.resume?.trim();
  const jobDescription = body.jobDescription?.trim();
  const tone = body.tone ?? "Professional";

  if (!resume || !jobDescription) {
    return NextResponse.json({ error: "Resume and job description are required." }, { status: 400 });
  }

  const prompt = `You are an expert career coach. Write a concise, compelling cover letter tailored to the provided resume and job description.

Tone: ${tone}

Resume:\n${resume}\n\nJob Description:\n${jobDescription}\n\nRequirements:
- Keep it professional and specific.
- Match the candidate experience to the job requirements.
- 3 to 5 paragraphs.
- Avoid placeholders.
- Return plain text only.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        temperature: 0.6,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Anthropic API error: ${errorBody}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const coverLetter = data.content
      ?.filter((item) => item.type === "text" && Boolean(item.text))
      .map((item) => item.text)
      .join("\n")
      .trim();

    if (!coverLetter) {
      return NextResponse.json({ error: "No cover letter was generated." }, { status: 502 });
    }

    return NextResponse.json({ coverLetter });
  } catch {
    return NextResponse.json({ error: "Failed to call Anthropic API." }, { status: 500 });
  }
}
