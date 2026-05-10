"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const CENSUS_BASE = "https://nationalarchives.ie/collections/search-the-1926-census/";
const CENSUS_RESULTS = `${CENSUS_BASE}search-results/`;
const HERO_IMAGE = "https://nationalarchives.ie/wp-content/uploads/2026/03/Hero-1926.jpg";

const IRISH_COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin",
  "Galway", "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim",
  "Limerick", "Longford", "Louth", "Mayo", "Meath", "Monaghan",
  "Offaly", "Roscommon", "Sligo", "Tipperary", "Waterford",
  "Westmeath", "Wexford", "Wicklow",
];

function buildSearchUrl(surname: string, firstName: string, county: string, townland: string): string {
  const params = new URLSearchParams();
  if (surname.trim())   params.set("surname__icontains", surname.trim());
  if (firstName.trim()) params.set("first_name__icontains", firstName.trim());
  if (county)           params.set("county", county);
  if (townland.trim())  params.set("townland__icontains", townland.trim());
  const qs = params.toString();
  return qs ? `${CENSUS_RESULTS}#${qs}` : CENSUS_BASE;
}

interface Props {
  initialSurname?: string;
  initialForename?: string;
}

export default function CensusSearch({ initialSurname = "", initialForename = "" }: Props) {
  const t = useTranslations("census");

  const [surname, setSurname] = useState(initialSurname);
  const [firstName, setFirstName] = useState(initialForename);
  const [county, setCounty] = useState("");
  const [townland, setTownland] = useState("");

  const searchUrl = buildSearchUrl(surname, firstName, county, townland);
  const hasQuery = !!(surname.trim() || firstName.trim() || county || townland.trim());

  return (
    <div className="flex flex-col gap-5">

      {/* Hero image */}
      <div className="relative rounded-xl overflow-hidden bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt="1926 Irish Census — National Archives of Ireland"
          className="w-full object-cover max-h-56"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-4">
          <p className="text-white font-semibold text-base leading-snug drop-shadow">
            {t("heroTitle")}
          </p>
          <p className="text-stone-200 text-xs mt-0.5 drop-shadow">
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      {/* What the census contains */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(t.raw("contentsItems") as string[]).map((item: string) => (
          <div key={item} className="flex items-center gap-1.5 text-xs text-stone-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            <span className="text-amber-600">•</span> {item}
          </div>
        ))}
      </div>

      {/* Search form */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-medium text-stone-600">{t("searchPrompt")}</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-stone-500 mb-1">{t("fieldSurname")}</label>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder={t("fieldSurnamePlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-stone-500 mb-1">{t("fieldForename")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("fieldForenamePlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex-1 min-w-32">
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
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-stone-500 mb-1">{t("fieldTownland")}</label>
            <input
              value={townland}
              onChange={(e) => setTownland(e.target.value)}
              placeholder={t("fieldTownlandPlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 w-full justify-center bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          {hasQuery ? t("searchWithFields") : t("searchBrowse")}
          <span>↗</span>
        </a>
        <p className="text-xs text-stone-400 text-center">{t("opensInNewTab")}</p>
      </div>

      {/* Attribution */}
      <p className="text-xs text-stone-400 text-center">
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
    </div>
  );
}
