"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { routing } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    // Pathname includes the locale prefix, e.g. /en/family → /de/family
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || "/");
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      aria-label={t("label")}
      className="text-sm rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-stone-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {t(loc)}
        </option>
      ))}
    </select>
  );
}
