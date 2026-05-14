import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export async function Navbar() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-navy-900/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          Lettro
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Pricing
          </Link>
          <Link
            href="/generate"
            className="rounded-lg border border-gold-500/60 px-4 py-2 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/10"
          >
            Get Started
          </Link>
          {user ? (
            <>
              <Link
                href="/account"
                className="rounded-lg border border-gold-500/60 px-4 py-2 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/10"
              >
                My Account
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-gold-500/60 px-4 py-2 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/10"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
