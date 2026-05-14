import Link from "next/link";

type PlanCard = {
  name: string;
  price: string;
  subtitle: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
};

const WHOP_PRO_URL = "https://whop.com/lettro/lettro-pro-monthly";

const plans: PlanCard[] = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Great for trying Lettro",
    features: ["3 free generations", "Professional output", "Basic support"],
    cta: "Get Started Free",
    href: "/generate",
    highlighted: false,
  },
  {
    name: "Pro Monthly",
    price: "$9.99/month",
    subtitle: "Best for active job seekers",
    features: ["Unlimited generations", "Priority quality", "Priority support"],
    cta: "Get Pro Now",
    href: WHOP_PRO_URL,
    highlighted: true,
  },
  {
    name: "Pro Yearly",
    price: "$79.99/year",
    subtitle: "Best value for long-term use",
    features: ["Unlimited generations", "Priority quality", "Priority support"],
    cta: "Get Pro Now",
    href: WHOP_PRO_URL,
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Simple Pricing</h1>
        <p className="mt-3 text-slate-300">Choose the plan that fits your job search.</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-2xl border p-6 shadow-glow ${
              plan.highlighted
                ? "border-gold-500/70 bg-navy-900"
                : "border-slate-700 bg-slate-900/60"
            }`}
          >
            <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
            <p className="mt-2 text-3xl font-bold text-gold-400">{plan.price}</p>
            <p className="mt-2 text-sm text-slate-300">{plan.subtitle}</p>

            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              {plan.features.map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>

            <div className="mt-6">
              {plan.href.startsWith("http") ? (
                <a
                  href={plan.href}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gold-500/70 bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  href={plan.href}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gold-500/70 bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
