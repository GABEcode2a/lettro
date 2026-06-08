export const JOB_STATUSES = [
  "Applied",
  "Interview Scheduled",
  "Offer Received",
  "Rejected",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobApplication = {
  id: string;
  user_id: string;
  job_title: string;
  company: string;
  date_applied: string;
  status: JobStatus;
  notes: string | null;
  created_at: string;
};

export function isValidJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}

export function statusBadgeClasses(status: JobStatus): string {
  switch (status) {
    case "Applied":
      return "border-blue-500/40 bg-blue-500/15 text-blue-400";
    case "Interview Scheduled":
      return "border-gold-500/40 bg-gold-500/15 text-gold-400";
    case "Offer Received":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-400";
    case "Rejected":
      return "border-slate-500/40 bg-slate-500/15 text-slate-400";
  }
}

export function formatDateApplied(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
