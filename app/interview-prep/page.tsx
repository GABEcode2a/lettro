import { InterviewPrep } from "@/components/interview-prep";

export default function InterviewPrepPage() {
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-white sm:text-4xl">Interview Prep</h1>
      <p className="mt-2 text-slate-300">
        Paste a job description and get tailored interview questions with sample answers to practice
        before the big day.
      </p>
      <InterviewPrep />
    </section>
  );
}
