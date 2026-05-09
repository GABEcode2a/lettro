import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

function ResetPasswordFallback() {
  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
      <p className="text-sm text-slate-300">Loading...</p>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
