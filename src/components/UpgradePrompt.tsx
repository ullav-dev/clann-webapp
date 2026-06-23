"use client";

import { useTranslations } from "next-intl";

interface UpgradePromptProps {
  /** i18n key within the "limits" namespace, e.g. "treeLimitTitle". */
  titleKey: string;
  messageKey: string;
  /** Optional extra classes for the outer wrapper. */
  className?: string;
}

export default function UpgradePrompt({ titleKey, messageKey, className = "" }: UpgradePromptProps) {
  const t = useTranslations("limits");
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 ${className}`}>
      <span className="text-xl shrink-0">⚡</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-800">{t(titleKey)}</p>
        <p className="text-sm text-amber-700 mt-0.5">{t(messageKey)}</p>
      </div>
    </div>
  );
}
