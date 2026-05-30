import { ResumeBuilder } from "@/components/resume-builder";

export default function ResumeBuilderPage() {
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-white sm:text-4xl">Resume Builder</h1>
      <p className="mt-2 text-slate-300">
        Paste your experience, skills, and education to generate a professional, ATS-optimized resume.
      </p>
      <ResumeBuilder />
    </section>
  );
}
