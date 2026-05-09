"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password?recovery=1`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(true);
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
      <h1 className="text-2xl font-bold text-white">Reset your password</h1>
      <p className="mt-2 text-sm text-slate-300">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Please wait..." : "Send Reset Link"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
      {success ? (
        <p className="mt-4 text-sm text-emerald-400">
          If an account exists for that email, we&apos;ve sent a reset link. Check your inbox and spam folder.
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-300">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-gold-400 hover:text-gold-500">
          Back to login
        </Link>
      </p>
    </section>
  );
}
