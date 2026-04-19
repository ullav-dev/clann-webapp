"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const CENSUS_BASE = "https://nationalarchives.ie/collections/search-the-1926-census/";
const CENSUS_RESULTS = `${CENSUS_BASE}search-results/`;

const IRISH_COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin",
  "Galway", "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim",
  "Limerick", "Longford", "Louth", "Mayo", "Meath", "Monaghan",
  "Offaly", "Roscommon", "Sligo", "Tipperary", "Waterford",
  "Westmeath", "Wexford", "Wicklow",
];

function buildSearchUrl(surname: string, forename: string, county: string): string {
  const params = new URLSearchParams();
  if (surname.trim())  params.set("surname__icontains", surname.trim());
  if (forename.trim()) params.set("forename__icontains", forename.trim());
  if (county)          params.set("county", county);
  const qs = params.toString();
  return qs ? `${CENSUS_RESULTS}?${qs}` : CENSUS_BASE;
}

interface Props {
  initialSurname?: string;
  initialForename?: string;
}

export default function CensusSearch({ initialSurname = "", initialForename = "" }: Props) {
  const t = useTranslations("census");

  const [surname, setSurname] = useState(initialSurname);
  const [forename, setForename] = useState(initialForename);
  const [county, setCounty] = useState("");
  const [iframeSrc, setIframeSrc] = useState(CENSUS_BASE);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const searchUrl = buildSearchUrl(surname, forename, county);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setIframeBlocked(false);
    setIframeSrc(searchUrl);
    setIframeKey((k) => k + 1);
  }

  function handleReset() {
    setSurname("");
    setForename("");
    setCounty("");
    setIframeSrc(CENSUS_BASE);
    setIframeKey((k) => k + 1);
    setIframeBlocked(false);
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-32">
          <label className="block text-xs text-stone-500 mb-1">{t("fieldSurname")}</label>
          <input
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder={t("fieldSurnamePlaceholder")}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex-1 min-w-32">
          <label className="block text-xs text-stone-500 mb-1">{t("fieldForename")}</label>
          <input
            value={forename}
            onChange={(e) => setForename(e.target.value)}
            placeholder={t("fieldForenamePlaceholder")}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex-1 min-w-36">
          <label className="block text-xs text-stone-500 mb-1">{t("fieldCounty")}</label>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
          >
            <option value="">{t("allCounties")}</option>
            {IRISH_COUNTIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {t("search")}
          </button>
          {(surname || forename || county) && (
            <button
              type="button"
              onClick={handleReset}
              className="border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm px-3 py-2 rounded-lg transition-colors"
            >
              {t("reset")}
            </button>
          )}
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {t("openInTab")} ↗
          </a>
        </div>
      </form>

      {/* Attribution */}
      <p className="text-xs text-stone-400">
        {t("attribution")}{" "}
        <a
          href="https://nationalarchives.ie"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-stone-600"
        >
          {t("attributionLink")}
        </a>
        {" "}— CC BY 4.0
      </p>

      {/* Iframe / fallback */}
      {iframeBlocked ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-64 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 gap-3 p-6 text-center">
          <span className="text-4xl">🚫</span>
          <p className="text-sm font-medium">{t("iframeBlocked")}</p>
          <p className="text-xs text-stone-400">{t("iframeBlockedHint")}</p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {t("openInTab")} ↗
          </a>
        </div>
      ) : (
        <div className="relative flex-1 min-h-[500px] rounded-xl overflow-hidden border border-stone-200">
          <iframe
            key={iframeKey}
            src={iframeSrc}
            title="1926 Irish Census — National Archives of Ireland"
            className="w-full h-full min-h-[500px]"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onError={() => setIframeBlocked(true)}
          />
          {/* Overlay hint — shown until user interacts */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none px-4 py-3 flex items-end justify-between">
            <p className="text-xs text-stone-500">{t("iframeHint")}</p>
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto text-xs text-amber-700 hover:underline font-medium"
            >
              {t("openInTab")} ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
