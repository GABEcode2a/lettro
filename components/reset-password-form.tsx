"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useLayoutEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const isRecoveryQuery = searchParams.get("recovery") === "1";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    if (hashParams.get("type") === "recovery") {
      setRecoveryReady(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
      }
    });

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (isRecoveryQuery && sessionData.session) {
        setRecoveryReady(true);
      } else if (isRecoveryQuery && !sessionData.session) {
        await new Promise((r) => setTimeout(r, 500));
        const { data: retry } = await supabase.auth.getSession();
        if (retry.session) {
          setRecoveryReady(true);
        }
      }
      setChecking(false);
    })();

    return () => subscription.unsubscribe();
  }, [supabase, isRecoveryQuery]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    router.refresh();
    setTimeout(() => router.push("/login"), 2000);
  }

  if (checking) {
    return (
      <section className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
        <p className="text-sm text-slate-300">Verifying reset link...</p>
      </section>
    );
  }

  if (!recoveryReady) {
    return (
      <section className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
        <h1 className="text-2xl font-bold text-white">Invalid or expired link</h1>
        <p className="mt-2 text-sm text-slate-300">
          This reset link is invalid or has expired. Request a new one from the login page.
        </p>
        <p className="mt-6 text-sm text-slate-300">
          <Link href="/forgot-password" className="font-semibold text-gold-400 hover:text-gold-500">
            Forgot password
          </Link>
          {" · "}
          <Link href="/login" className="font-semibold text-gold-400 hover:text-gold-500">
            Back to login
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
      <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
      <p className="mt-2 text-sm text-slate-300">Enter and confirm your new password below.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="new-password" className="text-sm font-medium text-slate-200">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
            placeholder="At least 6 characters"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium text-slate-200">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
            placeholder="Repeat your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Please wait..." : success ? "Done" : "Update password"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
      {success ? (
        <p className="mt-4 text-sm text-emerald-400">
          Your password has been updated. Redirecting to sign in...
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-300">
        <Link href="/login" className="font-semibold text-gold-400 hover:text-gold-500">
          Back to login
        </Link>
      </p>
    </section>
  );
}
