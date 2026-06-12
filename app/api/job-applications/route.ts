import { NextRequest, NextResponse } from "next/server";
import { isValidJobStatus, type JobApplication } from "@/lib/job-applications";
import { createClient } from "@/lib/supabase/server";
import {
  FREE_JOB_LIMIT,
  hasUnlimitedGenerations,
  isOverFreeLimit,
  type UsageAccessFlags,
} from "@/lib/usage-limits";

type CreatePayload = {
  job_title?: string;
  company?: string;
  date_applied?: string;
  status?: string;
  notes?: string;
};

async function getAccessFlags(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<UsageAccessFlags> {
  const { data } = await supabase
    .from("user_usage")
    .select("is_pro, is_admin")
    .eq("user_id", userId)
    .maybeSingle<{ is_pro: boolean; is_admin: boolean }>();

  return {
    is_pro: data?.is_pro ?? false,
    is_admin: data?.is_admin ?? false,
  };
}

async function getJobCount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("job_applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please login to view your jobs." }, { status: 401 });
  }

  const [accessFlags, jobCountResult] = await Promise.all([
    getAccessFlags(supabase, user.id),
    supabase
      .from("job_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("date_applied", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (jobCountResult.error) {
    return NextResponse.json({ error: jobCountResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    jobs: (jobCountResult.data ?? []) as JobApplication[],
    usageCount: jobCountResult.data?.length ?? 0,
    freeLimit: FREE_JOB_LIMIT,
    isPro: hasUnlimitedGenerations(accessFlags),
  });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please login to add a job." }, { status: 401 });
  }

  const body = (await request.json()) as CreatePayload;
  const job_title = body.job_title?.trim();
  const company = body.company?.trim();
  const date_applied = body.date_applied?.trim();
  const status = body.status?.trim() ?? "Applied";
  const notes = body.notes?.trim() || null;

  if (!job_title || !company || !date_applied) {
    return NextResponse.json(
      { error: "Job title, company, and date applied are required." },
      { status: 400 },
    );
  }

  if (!isValidJobStatus(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const accessFlags = await getAccessFlags(supabase, user.id);

  try {
    const currentCount = await getJobCount(supabase, user.id);

    if (isOverFreeLimit(currentCount, FREE_JOB_LIMIT, accessFlags)) {
      return NextResponse.json(
        {
          error: "You've reached your 3 free job entries. Upgrade to Pro for unlimited tracking.",
          code: "FREE_LIMIT_REACHED",
        },
        { status: 403 },
      );
    }

    const { data: job, error: insertError } = await supabase
      .from("job_applications")
      .insert({
        user_id: user.id,
        job_title,
        company,
        date_applied,
        status,
        notes,
      })
      .select("*")
      .single<JobApplication>();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      job,
      usageCount: currentCount + 1,
      freeLimit: FREE_JOB_LIMIT,
      isPro: hasUnlimitedGenerations(accessFlags),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
