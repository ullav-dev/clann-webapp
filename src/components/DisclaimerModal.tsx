"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";

interface Props {
  onClose: () => void;
}

export default function DisclaimerModal({ onClose }: Props) {
  const t = useTranslations("disclaimer");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdrop}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 shrink-0">
          <h2 id="disclaimer-title" className="font-bold text-stone-800">{t("modalTitle")}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors text-xl leading-none"
            aria-label={t("modalClose")}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 prose prose-stone prose-sm max-w-none">
          <ReactMarkdown>{t("content")}</ReactMarkdown>
        </div>
        <div className="px-6 py-4 border-t border-stone-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded-lg transition-colors text-sm"
          >
            {t("modalClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
