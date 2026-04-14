"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface UpgradePromptProps {
  /** i18n key within the "limits" namespace, e.g. "treeLimitTitle". */
  titleKey: string;
  messageKey: string;
  /** Optional extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Inline amber banner shown when the user has hit a plan limit.
 * Always includes a link to /pricing.
 */
export default function UpgradePrompt({ titleKey, messageKey, className = "" }: UpgradePromptProps) {
  const t = useTranslations("limits");
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 ${className}`}>
      <span className="text-xl shrink-0">⚡</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-800">{t(titleKey)}</p>
        <p className="text-sm text-amber-700 mt-0.5">{t(messageKey)}</p>
        <Link
          href="/pricing"
          className="inline-block mt-2 text-sm font-medium text-amber-900 underline hover:text-amber-700 transition-colors"
        >
          {t("upgradeLink")} →
        </Link>
      </div>
    </div>
  );
}
