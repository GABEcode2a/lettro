import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Lettro - AI Career Platform | Cover Letters, Resumes & More",
  description: "AI-powered career platform. Generate cover letters, build resumes, prep for interviews and track applications in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
