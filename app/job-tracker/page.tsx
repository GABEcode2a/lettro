import { redirect } from "next/navigation";
import { JobTracker } from "@/components/job-tracker";
import { createClient } from "@/lib/supabase/server";

export default async function JobTrackerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-white sm:text-4xl">Job Tracker</h1>
      <p className="mt-2 text-slate-300">
        Keep track of every application — from first apply to final offer — all in one place.
      </p>
      <JobTracker />
    </section>
  );
}
