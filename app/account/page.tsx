import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type UsageRow = {
  generation_count: number;
  is_pro: boolean;
};

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("user_usage")
    .select("generation_count, is_pro")
    .eq("user_id", user.id)
    .maybeSingle<UsageRow>();

  const generationCount = data?.generation_count ?? 0;
  const isPro = data?.is_pro ?? false;
  const remaining = Math.max(0, 3 - generationCount);

  return (
    <section className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
      <h1 className="text-3xl font-bold text-white">My Account</h1>
      <p className="mt-2 text-slate-300">Signed in as {user.email}</p>

      <div className="mt-6 rounded-xl border border-slate-700 bg-navy-900 p-4">
        <p className="text-slate-200">
          Plan:{" "}
          <span className={isPro ? "font-semibold text-gold-400" : "font-semibold text-slate-200"}>
            {isPro ? "Pro" : "Free"}
          </span>
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {isPro
            ? `Generations used so far: ${generationCount} (unlimited plan)`
            : `Free generations used: ${generationCount} / 3 (remaining: ${remaining})`}
        </p>
      </div>

      <Link
        href="/generate"
        className="mt-6 inline-flex rounded-lg border border-gold-500/60 px-4 py-2 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/10"
      >
        Go to Generator
      </Link>
    </section>
  );
}
