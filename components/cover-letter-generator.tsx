"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UpgradePromptModal } from "@/components/upgrade-prompt-modal";
import { downloadCoverLetterPdf } from "@/lib/cover-letter-pdf";

type Tone = "Professional" | "Confident" | "Friendly";

const tones: Tone[] = ["Professional", "Confident", "Friendly"];

export function CoverLetterGenerator() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<Tone>("Professional");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [freeLimit, setFreeLimit] = useState<number | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSubmit = useMemo(() => {
    return resume.trim().length > 0 && jobDescription.trim().length > 0 && !loading;
  }, [resume, jobDescription, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setCopied(false);
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, tone }),
      });

      const data = (await response.json()) as {
        coverLetter?: string;
        error?: string;
        code?: string;
        usageCount?: number;
        freeLimit?: number;
      };

      if (response.status === 403 && data.code === "FREE_LIMIT_REACHED") {
        setUpgradeModalOpen(true);
        return;
      }

      if (!response.ok || !data.coverLetter) {
        throw new Error(data.error ?? "Unable to generate cover letter.");
      }

      setCoverLetter(data.coverLetter);
      setUsageCount(data.usageCount ?? null);
      setFreeLimit(data.freeLimit ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!coverLetter.trim()) return;
    try {
      await navigator.clipboard.writeText(coverLetter);
    } catch {
      setError("Could not copy to clipboard.");
      return;
    }
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => {
      setCopied(false);
      copyResetRef.current = null;
    }, 2000);
  }

  async function downloadPdf() {
    const text = coverLetter.trim();
    if (!text) return;

    try {
      await downloadCoverLetterPdf(text, resume);
    } catch {
      setError("Could not generate PDF.");
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <UpgradePromptModal open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow sm:p-6"
      >
        <p className="text-sm text-slate-300">
          You must be logged in to generate.{" "}
          <Link href="/login" className="font-semibold text-gold-400 hover:text-gold-500">
            Login here
          </Link>
          .
        </p>

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
          <p className="text-sm font-medium text-slate-200">Tone</p>
          <p className="text-xs text-slate-400">Choose how the letter should read before you generate.</p>
          <div className="flex flex-wrap gap-2">
            {tones.map((toneOption) => {
              const selected = tone === toneOption;
              return (
                <button
                  key={toneOption}
                  type="button"
                  onClick={() => setTone(toneOption)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                    selected
                      ? "border-gold-500 bg-gold-500/15 text-gold-400 shadow-glow"
                      : "border-slate-600 bg-navy-900 text-slate-200 hover:border-gold-500/50 hover:text-gold-400"
                  }`}
                >
                  {toneOption}
                </button>
              );
            })}
          </div>
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
        {usageCount !== null && freeLimit !== null ? (
          <p className="text-sm text-slate-300">
            Free generations used: {usageCount}/{freeLimit}
          </p>
        ) : null}
      </form>

      {coverLetter ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Generated Cover Letter</h2>
          <label htmlFor="coverLetterOutput" className="sr-only">
            Editable cover letter
          </label>
          <textarea
            id="coverLetterOutput"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={16}
            spellCheck
            className="mb-4 w-full resize-y rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm leading-7 text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex min-w-[10rem] items-center justify-center rounded-xl border border-gold-500 bg-gold-500/10 px-4 py-2.5 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/20"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex min-w-[10rem] items-center justify-center rounded-xl border border-gold-500 bg-gold-500/10 px-4 py-2.5 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/20"
            >
              Download as PDF
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
