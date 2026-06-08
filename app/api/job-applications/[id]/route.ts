import { NextRequest, NextResponse } from "next/server";
import { isValidJobStatus, type JobApplication } from "@/lib/job-applications";
import { createClient } from "@/lib/supabase/server";
import { FREE_JOB_LIMIT, hasUnlimitedGenerations } from "@/lib/usage-limits";

type UpdatePayload = {
  job_title?: string;
  company?: string;
  date_applied?: string;
  status?: string;
  notes?: string;
};

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please login to update a job." }, { status: 401 });
  }

  const body = (await request.json()) as UpdatePayload;
  const updates: Record<string, string | null> = {};

  if (body.job_title !== undefined) {
    const job_title = body.job_title.trim();
    if (!job_title) {
      return NextResponse.json({ error: "Job title cannot be empty." }, { status: 400 });
    }
    updates.job_title = job_title;
  }

  if (body.company !== undefined) {
    const company = body.company.trim();
    if (!company) {
      return NextResponse.json({ error: "Company cannot be empty." }, { status: 400 });
    }
    updates.company = company;
  }

  if (body.date_applied !== undefined) {
    const date_applied = body.date_applied.trim();
    if (!date_applied) {
      return NextResponse.json({ error: "Date applied is required." }, { status: 400 });
    }
    updates.date_applied = date_applied;
  }

  if (body.status !== undefined) {
    if (!isValidJobStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("job_applications")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle<JobApplication>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please login to delete a job." }, { status: 401 });
  }

  const { data: deleted, error } = await supabase
    .from("job_applications")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!deleted) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const { count } = await supabase
    .from("job_applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: usageRow } = await supabase
    .from("user_usage")
    .select("is_pro, is_admin")
    .eq("user_id", user.id)
    .maybeSingle<{ is_pro: boolean; is_admin: boolean }>();

  const accessFlags = {
    is_pro: usageRow?.is_pro ?? false,
    is_admin: usageRow?.is_admin ?? false,
  };

  return NextResponse.json({
    usageCount: count ?? 0,
    freeLimit: FREE_JOB_LIMIT,
    isPro: hasUnlimitedGenerations(accessFlags),
  });
}
