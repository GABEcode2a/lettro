import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-navy-900/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          Lettro
        </Link>
        <Link
          href="/generate"
          className="rounded-lg border border-gold-500/60 px-4 py-2 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/10"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
