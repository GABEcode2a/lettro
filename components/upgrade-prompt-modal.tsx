"use client";

import { useEffect, useRef } from "react";

const WHOP_PRO_URL = "https://whop.com/lettro/lettro-pro-monthly";

type UpgradePromptModalProps = {
  open: boolean;
  onClose: () => void;
};

export function UpgradePromptModal({ open, onClose }: UpgradePromptModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-navy-900/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        aria-describedby="upgrade-modal-desc"
        tabIndex={-1}
        className="relative mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-md overflow-y-auto rounded-2xl border border-gold-500/25 bg-gradient-to-b from-slate-900/95 to-navy-900 p-6 shadow-glow outline-none sm:mx-6 sm:mb-0 sm:p-8"
      >
        <div
          className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent sm:left-8 sm:right-8"
          aria-hidden
        />

        <div className="mt-2 flex justify-center">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 text-xl"
            aria-hidden
          >
            ✦
          </span>
        </div>

        <h2
          id="upgrade-modal-title"
          className="mt-4 text-center text-xl font-bold tracking-tight text-white sm:text-2xl"
        >
          You&apos;ve used all 3 free generations!
        </h2>

        <p
          id="upgrade-modal-desc"
          className="mt-3 text-center text-sm leading-relaxed text-slate-300 sm:text-base"
        >
          Upgrade to Lettro Pro for unlimited cover letters
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:mt-10">
          <a
            href={WHOP_PRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gold-500 px-5 py-3.5 text-center text-sm font-semibold text-navy-900 shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition hover:bg-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
          >
            Upgrade to Pro - $9.99/month
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-600/80 bg-transparent px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500/50"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
