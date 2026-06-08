"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UpgradePromptModal } from "@/components/upgrade-prompt-modal";
import {
  formatDateApplied,
  JOB_STATUSES,
  statusBadgeClasses,
  type JobApplication,
  type JobStatus,
} from "@/lib/job-applications";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function JobTracker() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [freeLimit, setFreeLimit] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [dateApplied, setDateApplied] = useState(todayIsoDate());
  const [status, setStatus] = useState<JobStatus>("Applied");
  const [notes, setNotes] = useState("");

  const [editStatus, setEditStatus] = useState<JobStatus>("Applied");
  const [editNotes, setEditNotes] = useState("");

  const canSubmit = useMemo(() => {
    return jobTitle.trim().length > 0 && company.trim().length > 0 && dateApplied && !submitting;
  }, [jobTitle, company, dateApplied, submitting]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/job-applications");
      const data = (await response.json()) as {
        jobs?: JobApplication[];
        error?: string;
        usageCount?: number;
        freeLimit?: number;
        isPro?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load jobs.");
      }

      setJobs(data.jobs ?? []);
      setUsageCount(data.usageCount ?? null);
      setFreeLimit(data.freeLimit ?? null);
      setIsPro(data.isPro ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  function openJob(job: JobApplication) {
    if (expandedId === job.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(job.id);
    setEditStatus(job.status);
    setEditNotes(job.notes ?? "");
  }

  async function onAddJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: jobTitle,
          company,
          date_applied: dateApplied,
          status,
          notes: notes.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        job?: JobApplication;
        error?: string;
        code?: string;
        usageCount?: number;
        freeLimit?: number;
        isPro?: boolean;
      };

      if (response.status === 403 && data.code === "FREE_LIMIT_REACHED") {
        setUpgradeModalOpen(true);
        return;
      }

      if (!response.ok || !data.job) {
        throw new Error(data.error ?? "Unable to add job.");
      }

      setJobs((prev) => [data.job!, ...prev]);
      setUsageCount(data.usageCount ?? null);
      setFreeLimit(data.freeLimit ?? null);
      setIsPro(data.isPro ?? false);
      setJobTitle("");
      setCompany("");
      setDateApplied(todayIsoDate());
      setStatus("Applied");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveJob(jobId: string) {
    setSavingId(jobId);
    setError("");

    try {
      const response = await fetch(`/api/job-applications/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
        }),
      });

      const data = (await response.json()) as {
        job?: JobApplication;
        error?: string;
      };

      if (!response.ok || !data.job) {
        throw new Error(data.error ?? "Unable to update job.");
      }

      setJobs((prev) => prev.map((job) => (job.id === jobId ? data.job! : job)));
      setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingId(null);
    }
  }

  async function onDeleteJob(jobId: string) {
    setDeletingId(jobId);
    setError("");

    try {
      const response = await fetch(`/api/job-applications/${jobId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        error?: string;
        usageCount?: number;
        freeLimit?: number;
        isPro?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete job.");
      }

      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      setUsageCount(data.usageCount ?? null);
      setFreeLimit(data.freeLimit ?? null);
      setIsPro(data.isPro ?? false);
      if (expandedId === jobId) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <UpgradePromptModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="You've reached your 5 free job entries!"
        description="Upgrade to Lettro Pro for unlimited job tracking, cover letters, resumes, and more"
      />

      <form
        onSubmit={onAddJob}
        className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow sm:p-6"
      >
        <h2 className="text-lg font-semibold text-white">Add a Job</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="jobTitle" className="text-sm font-medium text-slate-200">
              Job Title
            </label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium text-slate-200">
              Company Name
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dateApplied" className="text-sm font-medium text-slate-200">
              Date Applied
            </label>
            <input
              id="dateApplied"
              type="date"
              value={dateApplied}
              onChange={(e) => setDateApplied(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 focus:border-gold-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium text-slate-200">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
              className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm font-semibold text-slate-100 focus:border-gold-500 focus:outline-none"
            >
              {JOB_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium text-slate-200">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Interview details, contact names, follow-up reminders..."
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-900 border-t-transparent" />
              Adding...
            </>
          ) : (
            "Add Job"
          )}
        </button>

        {usageCount !== null && freeLimit !== null && !isPro ? (
          <p className="text-sm text-slate-300">
            Free jobs tracked: {usageCount}/{freeLimit}
          </p>
        ) : null}
      </form>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Your Applications</h2>
          {jobs.length > 0 ? (
            <span className="text-sm text-slate-400">
              {jobs.length} job{jobs.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No jobs tracked yet. Add your first application above.
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const isExpanded = expandedId === job.id;
              const panelId = `job-panel-${job.id}`;
              const buttonId = `job-header-${job.id}`;

              return (
                <div
                  key={job.id}
                  className="overflow-hidden rounded-xl border border-slate-700 bg-navy-900"
                >
                  <div className="flex items-start gap-2 p-1">
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => openJob(job)}
                      className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-800/50"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-white">{job.job_title}</p>
                        <p className="truncate text-sm text-slate-300">{job.company}</p>
                        <p className="text-xs text-slate-400">
                          Applied {formatDateApplied(job.date_applied)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(job.status)}`}
                        >
                          {job.status}
                        </span>
                        <span
                          className={`text-xs text-gold-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          aria-hidden
                        >
                          ▾
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => void onDeleteJob(job.id)}
                      disabled={deletingId === job.id}
                      aria-label={`Delete ${job.job_title} at ${job.company}`}
                      className="mt-2 shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === job.id ? "..." : "Delete"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="border-t border-slate-700 px-4 py-4"
                    >
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label
                            htmlFor={`edit-status-${job.id}`}
                            className="text-sm font-medium text-slate-200"
                          >
                            Update Status
                          </label>
                          <select
                            id={`edit-status-${job.id}`}
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as JobStatus)}
                            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm font-semibold text-slate-100 focus:border-gold-500 focus:outline-none"
                          >
                            {JOB_STATUSES.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor={`edit-notes-${job.id}`}
                            className="text-sm font-medium text-slate-200"
                          >
                            Notes
                          </label>
                          <textarea
                            id={`edit-notes-${job.id}`}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={4}
                            placeholder="Add interview notes, follow-ups, or feedback..."
                            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => void onSaveJob(job.id)}
                          disabled={savingId === job.id}
                          className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl border border-gold-500 bg-gold-500/10 px-4 py-2.5 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === job.id ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
