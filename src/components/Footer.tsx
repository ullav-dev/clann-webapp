"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import TermsModal from "@/components/TermsModal";

export default function Footer() {
  const t = useTranslations("footer");
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <footer className="mt-16 border-t border-stone-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
          <span>© {new Date().getFullYear()} Clann</span>
          <button
            onClick={() => setShowTerms(true)}
            className="hover:text-stone-600 transition-colors underline underline-offset-2"
          >
            {t("termsLink")}
          </button>
        </div>
      </footer>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </>
  );
}
