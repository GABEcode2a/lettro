"use client";

import { FormEvent, useMemo, useState } from "react";

type Tone = "Professional" | "Friendly" | "Confident";

const tones: Tone[] = ["Professional", "Friendly", "Confident"];

export function CoverLetterGenerator() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => {
    return resume.trim().length > 0 && jobDescription.trim().length > 0 && !loading;
  }, [resume, jobDescription, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, tone }),
      });

      const data = (await response.json()) as { coverLetter?: string; error?: string };

      if (!response.ok || !data.coverLetter) {
        throw new Error(data.error ?? "Unable to generate cover letter.");
      }

      setCoverLetter(data.coverLetter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8 space-y-8">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow sm:p-6"
      >
        <div className="space-y-2">
          <label htmlFor="resume" className="text-sm font-medium text-slate-200">
            CV / Resume
          </label>
          <textarea
            id="resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={8}
            placeholder="Paste your resume content here..."
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="jobDescription" className="text-sm font-medium text-slate-200">
            Job Description
          </label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
            placeholder="Paste the job description here..."
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="tone" className="text-sm font-medium text-slate-200">
            Tone
          </label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 focus:border-gold-500 focus:outline-none"
          >
            {tones.map((toneOption) => (
              <option key={toneOption} value={toneOption}>
                {toneOption}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-w-56 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" />
              Generating...
            </>
          ) : (
            "Generate Cover Letter"
          )}
        </button>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </form>

      {coverLetter ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Generated Cover Letter</h2>
            <button
              type="button"
              onClick={copyToClipboard}
              className="rounded-lg border border-gold-500/50 px-3 py-2 text-sm font-medium text-gold-400 transition hover:bg-gold-500/10"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <article className="whitespace-pre-wrap rounded-xl bg-navy-900 p-4 text-sm leading-7 text-slate-200">
            {coverLetter}
          </article>
        </section>
      ) : null}
    </div>
  );
}
