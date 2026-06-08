const WHOP_PRO_URL = "https://whop.com/lettro/lettro-pro-monthly";

const proFeatures = [
  "AI Cover Letter Generator",
  "AI Resume Builder",
  "Interview Prep",
  "Job Tracker",
  "Unlimited generations",
  "Fully editable output",
  "PDF download",
  "Priority support",
  "More features coming soon",
];

export default function PricingPage() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Simple Pricing</h1>
        <p className="mt-3 text-slate-300">One plan with everything you need to land your next role.</p>
      </div>

      <div className="mx-auto mt-10 max-w-md">
        <article className="rounded-2xl border border-gold-500/70 bg-navy-900 p-6 shadow-glow sm:p-8">
          <h2 className="text-2xl font-semibold text-white">PRO</h2>
          <div className="mt-3 space-y-1">
            <p className="text-3xl font-bold text-gold-400">$24.99/month</p>
            <p className="text-lg font-semibold text-gold-400/90">or $199.99/year</p>
          </div>
          <p className="mt-2 text-sm text-slate-300">Everything you need for your job search.</p>

          <ul className="mt-6 space-y-2.5 text-sm text-slate-200">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 text-gold-400" aria-hidden="true">
                  ✓
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <a
              href={WHOP_PRO_URL}
              className="inline-flex w-full items-center justify-center rounded-xl border border-gold-500/70 bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
            >
              Get Pro Now
            </a>
          </div>
        </article>

        <p className="mt-6 text-center text-sm text-slate-400">
        Elite plan coming soon — LinkedIn Optimizer, Talent Platform and more
        </p>
      </div>
    </section>
  );
}
