import { CoverLetterGenerator } from "@/components/cover-letter-generator";

export default function GeneratePage() {
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-white sm:text-4xl">Cover Letter Generator</h1>
      <p className="mt-2 text-slate-300">
        Provide your experience and target role details to generate a tailored cover letter.
      </p>
      <CoverLetterGenerator />
    </section>
  );
}
