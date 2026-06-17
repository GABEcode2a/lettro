import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center text-center">
      <p className="mb-4 inline-flex rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1 text-sm font-medium text-gold-400">
        AI-Powered Career Platform
      </p>
      <h1 className="text-balance text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
      Stop Spending Hours on Job Applications
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-base text-slate-300 sm:text-lg">
      Lettro writes your cover letter and resume in seconds, preps you for interviews and tracks every application — so you can focus on getting hired.
      </p>
      <Link
        href="/generate"
        className="mt-10 inline-flex items-center rounded-xl bg-gold-500 px-6 py-3 text-base font-semibold text-navy-900 transition hover:bg-gold-400"
      >
        Generate My Cover Letter Free →
      </Link>
    </section>
  );
}
