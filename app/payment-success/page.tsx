import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentSuccessRedirect } from "@/components/payment-success-redirect";

export default async function PaymentSuccessPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("user_usage").upsert(
    { user_id: user.id, is_pro: true },
    { onConflict: "user_id" },
  );

  if (error) {
    return (
      <section className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-rose-500/40 bg-slate-900/60 p-6 shadow-glow">
        <h1 className="text-3xl font-bold text-white">Payment Received</h1>
        <p className="mt-2 text-rose-300">
          We could not activate Pro automatically. Please contact support.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-gold-500/40 bg-slate-900/60 p-6 text-center shadow-glow">
      <PaymentSuccessRedirect />
      <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
      <p className="mt-3 text-slate-300">Your Pro plan is now active.</p>
      <p className="mt-2 text-sm text-gold-400">Redirecting you to the generator in 3 seconds...</p>
    </section>
  );
}
