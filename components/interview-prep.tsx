"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UpgradePromptModal } from "@/components/upgrade-prompt-modal";

type InterviewType = "Behavioural" | "Technical" | "General";

type InterviewQuestion = {
  question: string;
  sampleAnswer: string;
};

const interviewTypes: InterviewType[] = ["Behavioural", "Technical", "General"];

function formatAllQuestions(questions: InterviewQuestion[]): string {
  return questions
    .map(
      (item, index) =>
        `${index + 1}. ${item.question}\n\nSample answer:\n${item.sampleAnswer}`,
    )
    .join("\n\n---\n\n");
}

export function InterviewPrep() {
  const [jobDescription, setJobDescription] = useState("");
  const [cv, setCv] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("General");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [freeLimit, setFreeLimit] = useState<number | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSubmit = useMemo(() => {
    return jobDescription.trim().length > 0 && !loading;
  }, [jobDescription, loading]);

  function toggleQuestion(index: number) {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setCopied(false);
    setQuestions([]);
    setOpenIndices(new Set());
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }

    try {
      const response = await fetch("/api/generate-interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, cv, interviewType }),
      });

      const data = (await response.json()) as {
        questions?: InterviewQuestion[];
        error?: string;
        code?: string;
        usageCount?: number;
        freeLimit?: number;
      };

      if (response.status === 403 && data.code === "FREE_LIMIT_REACHED") {
        setUpgradeModalOpen(true);
        return;
      }

      if (!response.ok || !data.questions?.length) {
        throw new Error(data.error ?? "Unable to generate interview questions.");
      }

      setQuestions(data.questions);
      setOpenIndices(new Set([0]));
      setUsageCount(data.usageCount ?? null);
      setFreeLimit(data.freeLimit ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!questions.length) return;
    try {
      await navigator.clipboard.writeText(formatAllQuestions(questions));
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

  return (
    <div className="mt-8 space-y-8">
      <UpgradePromptModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="You've used your 2 free interview prep sessions!"
        description="Upgrade to Lettro Pro for unlimited interview prep, cover letters, and resumes"
      />
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
          <label htmlFor="cv" className="text-sm font-medium text-slate-200">
            CV / Resume <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="cv"
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            rows={6}
            placeholder="Paste your CV to tailor sample answers to your experience..."
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="interviewType" className="text-sm font-medium text-slate-200">
            Interview Type
          </label>
          <select
            id="interviewType"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value as InterviewType)}
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm font-semibold text-slate-100 focus:border-gold-500 focus:outline-none"
          >
            {interviewTypes.map((type) => (
              <option key={type} value={type}>
                {type}
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
            "Generate Questions"
          )}
        </button>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {usageCount !== null && freeLimit !== null ? (
          <p className="text-sm text-slate-300">
            Free interview prep sessions used: {usageCount}/{freeLimit}
          </p>
        ) : null}
      </form>

      {questions.length > 0 ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Your Interview Questions</h2>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex min-w-[10rem] items-center justify-center rounded-xl border border-gold-500 bg-gold-500/10 px-4 py-2.5 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/20"
            >
              {copied ? "Copied!" : "Copy All"}
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((item, index) => {
              const isOpen = openIndices.has(index);
              const panelId = `interview-answer-${index}`;
              const buttonId = `interview-question-${index}`;

              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-slate-700 bg-navy-900"
                >
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleQuestion(index)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-800/50"
                  >
                    <span className="text-sm font-semibold text-white">
                      <span className="mr-2 text-gold-400">{index + 1}.</span>
                      {item.question}
                    </span>
                    <span
                      className={`mt-0.5 shrink-0 text-gold-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>
                  {isOpen ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="border-t border-slate-700 px-4 py-3"
                    >
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-400">
                        Sample Answer
                      </p>
                      <p className="text-sm leading-relaxed text-slate-300">{item.sampleAnswer}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <a href="/job-tracker" className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl transition-colors">
  ✨ Next: Track this application →
</a>
        </section>
      ) : null}
    </div>
  );
}
