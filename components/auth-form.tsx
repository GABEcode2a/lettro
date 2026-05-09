"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    router.push("/generate");
    router.refresh();
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
      <h1 className="text-2xl font-bold text-white">{isLogin ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-sm text-slate-300">
        {isLogin ? "Sign in to continue generating letters." : "Start generating tailored cover letters in seconds."}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-200">
              Password
            </label>
            {isLogin ? (
              <Link href="/forgot-password" className="text-sm font-semibold text-gold-400 hover:text-gold-500">
                Forgot Password?
              </Link>
            ) : null}
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-slate-700 bg-navy-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
            placeholder="At least 6 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

      <p className="mt-6 text-sm text-slate-300">
        {isLogin ? "Need an account? " : "Already have an account? "}
        <Link href={isLogin ? "/signup" : "/login"} className="font-semibold text-gold-400 hover:text-gold-500">
          {isLogin ? "Sign Up" : "Login"}
        </Link>
      </p>
    </section>
  );
}
