"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type {
  IrishGenealogyRecord,
  IrishGenealogySearchResponse,
} from "@/app/api/irish-genealogy/search/route";
import type { IrishGenealogyRecordDetail } from "@/app/api/irish-genealogy/record/route";

// ── Constants ───────────────────────────────────────────────────────────────

const SITE_URL = "https://www.irishgenealogy.ie";


const EVENT_TYPES = [
  { id: "birth",    label: "Birth",    emoji: "🌱", civil: true,  church: false },
  { id: "marriage", label: "Marriage", emoji: "💍", civil: true,  church: true  },
  { id: "death",    label: "Death",    emoji: "🕊️", civil: true,  church: false },
  { id: "baptism",  label: "Baptism",  emoji: "✝️", civil: false, church: true  },
  { id: "burial",   label: "Burial",   emoji: "⛪", civil: false, church: true  },
] as const;

const RECORD_TYPE_STYLES: Record<IrishGenealogyRecord["recordType"], {
  bg: string; text: string; border: string; emoji: string;
}> = {
  birth:    { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", emoji: "🌱" },
  marriage: { bg: "bg-violet-50",  text: "text-violet-800",  border: "border-violet-200",  emoji: "💍" },
  death:    { bg: "bg-stone-50",   text: "text-stone-700",   border: "border-stone-200",   emoji: "🕊️" },
  baptism:  { bg: "bg-sky-50",     text: "text-sky-800",     border: "border-sky-200",     emoji: "✝️" },
  burial:   { bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200",   emoji: "⛪" },
};

// ── Note helpers ────────────────────────────────────────────────────────────

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildNoteTitle(record: IrishGenealogyRecord): string {
  const type = record.recordType.charAt(0).toUpperCase() + record.recordType.slice(1);

  // Extract year — take the last 4-digit year-shaped number in the title
  const years = [...record.title.matchAll(/\b(1[5-9]\d{2}|20[0-2]\d)\b/g)].map((m) => m[1]);
  const year = years[years.length - 1] ?? "";

  // Extract the name(s) portion: everything between the opening "Verb of " and
  // the trailing " on / in / of <place>" clause
  const nameMatch = record.title.match(
    /^(?:Birth|Marriage|Death|Burial|Baptism) of (.+?)(?:\s+(?:on |in |of [A-Z]))/i
  );
  let names = nameMatch ? nameMatch[1] : "";

  // Marriage records: "PARTY1 and PARTY2" → "Party1 & Party2"
  names = names
    .split(/\s+and\s+/i)
    .map((n) => toTitleCase(n.trim()))
    .join(" & ");

  return year ? `${type}: ${names} (${year})` : `${type}: ${names}`;
}

function buildNoteBody(
  record: IrishGenealogyRecord,
  detail: IrishGenealogyRecordDetail | null
): string {
  const type = record.recordType.charAt(0).toUpperCase() + record.recordType.slice(1);
  const source = record.civilOrChurch === "civil" ? "Civil record" : "Church record";

  let body = `## ${type} Record\n\n`;
  body += `**${record.title}**\n\n`;

  // Fields table — merge list-view fields with any extra detail fields
  const merged: Record<string, string> = { ...record.fields };
  if (detail) {
    for (const [k, v] of Object.entries(detail.fields)) {
      if (!(k in merged)) merged[k] = v;
    }
  }
  if (Object.keys(merged).length > 0) {
    body += `| Field | Value |\n|---|---|\n`;
    for (const [k, v] of Object.entries(merged)) {
      body += `| ${k} | ${v} |\n`;
    }
    body += "\n";
  }

  body += `**Record type:** ${source}\n\n`;
  body += `[View original record on irishgenealogy.ie ↗](${record.viewUrl})\n`;

  if (detail?.imageLinks.length) {
    body += "\n### Original Record Images\n\n";
    for (const img of detail.imageLinks) {
      body += `- [📜 ${img.label}](${img.url})\n`;
    }
  }

  body +=
    "\n---\n*Source: [irishgenealogy.ie](https://www.irishgenealogy.ie) — Department of Culture, Communications & Sport of Ireland. Free and open public access.*";

  return body;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RecordCard({
  record,
  onSaveAsNote,
}: {
  record: IrishGenealogyRecord;
  onSaveAsNote: (title: string, description: string, body: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<IrishGenealogyRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const style = RECORD_TYPE_STYLES[record.recordType];

  // Fetch detail, hoisted so both expand and save can call it
  const fetchDetail = useCallback(async (): Promise<IrishGenealogyRecordDetail | null> => {
    if (detail) return detail;
    setLoading(true);
    try {
      const res = await fetch(`/api/irish-genealogy/record?id=${encodeURIComponent(record.recordId)}`);
      if (res.ok) {
        const d: IrishGenealogyRecordDetail = await res.json();
        setDetail(d);
        return d;
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [detail, record.recordId]);

  const handleExpand = () => {
    if (!expanded) fetchDetail();
    setExpanded((v) => !v);
  };

  const handleSaveAsNote = async () => {
    setSaving(true);
    try {
      const d = await fetchDetail();
      onSaveAsNote(
        buildNoteTitle(record),
        record.viewUrl,
        buildNoteBody(record, d)
      );
    } finally {
      setSaving(false);
    }
  };

  const hasImages = detail && detail.imageLinks.length > 0;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
      {/* Card header */}
      <div className="flex items-start gap-3 p-3">
        <span className="text-xl mt-0.5 flex-shrink-0">{style.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${style.text}`}>
            {record.title}
          </p>
          {/* Key fields inline */}
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
            {Object.entries(record.fields).map(([k, v]) => (
              <span key={k} className="text-xs text-stone-600">
                <span className="text-stone-400">{k}:</span> {v}
              </span>
            ))}
          </div>
          {/* Civil/church badge */}
          <span className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full font-medium
            ${record.civilOrChurch === "civil"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"}`}>
            {record.civilOrChurch === "civil" ? "Civil record" : "Church record"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <a
            href={record.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs bg-white border border-stone-200 hover:border-stone-400 text-stone-700 font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
          >
            View record ↗
          </a>
          <button
            onClick={handleSaveAsNote}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
          >
            {saving ? (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "📝"
            )}
            Save as note
          </button>
          <button
            onClick={handleExpand}
            className="inline-flex items-center gap-1 text-xs bg-white border border-stone-200 hover:border-stone-400 text-stone-700 font-medium px-2.5 py-1 rounded-lg transition-colors"
          >
            {loading && !saving ? (
              <span className="inline-block w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              "📄"
            )}
            {expanded ? "Close" : "Images"}
          </button>
        </div>
      </div>

      {/* Expanded detail / image panel */}
      {expanded && (
        <div className="border-t border-stone-200 bg-white/60 px-4 py-3">
          {loading && (
            <p className="text-xs text-stone-400 italic">Loading record detail…</p>
          )}
          {!loading && detail && (
            <>
              {/* Extra fields not already shown */}
              {Object.keys(detail.fields).length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(detail.fields).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-stone-400">{k}: </span>
                      <span className="text-stone-700 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {hasImages ? (
                <>
                  <p className="text-xs font-medium text-stone-600 mb-2">Original record images:</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.imageLinks.map((img, idx) => (
                      <a
                        key={idx}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 hover:border-amber-400 text-amber-800 font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        📜 {img.label}
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-stone-400 mt-2">
                    Images hosted on{" "}
                    <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      irishgenealogy.ie
                    </a>
                  </p>
                </>
              ) : (
                <p className="text-xs text-stone-400 italic">
                  No digitised images available for this record.
                </p>
              )}
            </>
          )}
          {!loading && !detail && (
            <p className="text-xs text-stone-400 italic">Could not load record detail.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialSurname?: string;
  initialForename?: string;
  onSaveAsNote: (title: string, description: string, body: string) => void;
}

export default function IrishGenealogySearch({
  initialSurname = "",
  initialForename = "",
  onSaveAsNote,
}: Props) {
  const t = useTranslations("irishGenealogy");

  // Form state
  const [firstname, setFirstname] = useState(initialForename);
  const [lastname, setLastname] = useState(initialSurname);
  const [recordSource, setRecordSource] = useState<"all" | "civil" | "church">("all");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set(["birth", "marriage", "death", "baptism", "burial"])
  );
  const [county, setCounty] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  // Result state
  const [results, setResults] = useState<IrishGenealogySearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const toggleEvent = (id: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter available event types based on record source
  const availableEvents = EVENT_TYPES.filter((e) => {
    if (recordSource === "civil") return e.civil;
    if (recordSource === "church") return e.church;
    return true;
  });

  const doSearch = useCallback(async (pg = 1) => {
    setLoading(true);
    setError(null);
    setCurrentPage(pg);

    const params = new URLSearchParams();
    if (firstname) params.set("firstname", firstname);
    if (lastname) params.set("lastname", lastname);
    params.set("recordSource", recordSource);
    params.set("events", [...selectedEvents].join(","));
    if (county) params.set("location", county);
    if (yearStart) params.set("yearStart", yearStart);
    if (yearEnd) params.set("yearEnd", yearEnd);
    if (pg > 1) params.set("pg", String(pg));

    try {
      const res = await fetch(`/api/irish-genealogy/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [firstname, lastname, recordSource, selectedEvents, county, yearStart, yearEnd]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(1);
  };

  // Build the direct link to the search on irishgenealogy.ie
  const buildDirectUrl = () => {
    const p = new URLSearchParams();
    if (firstname) p.set("firstname", firstname);
    if (lastname) p.set("lastname", lastname);
    p.set("church-or-civil", recordSource);
    if (county) p.set("location", county);
    if (yearStart) p.set("yearStart", yearStart);
    if (yearEnd) p.set("yearEnd", yearEnd);
    for (const ev of selectedEvents) p.set(`event-${ev}`, "1");
    return `${SITE_URL}/search/?${p.toString()}`;
  };

  const hasQuery = !!(firstname.trim() || lastname.trim() || county);

  // Pagination helpers
  const totalPages = results?.totalPages ?? 1;
  const showPagination = totalPages > 1;
  const pageWindow = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (currentPage <= 4) return i + 1;
    if (currentPage >= totalPages - 3) return totalPages - 6 + i;
    return currentPage - 3 + i;
  });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Hero ── */}
      <div className="relative rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #2d4a1e 0%, #4a6741 40%, #979f1c 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #fff 0%, transparent 60%)" }} />
        <div className="relative px-5 py-5 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.irishgenealogy.ie/app/uploads/2022/01/cropped-IrishGenealogy-logo-192x192.png"
            alt="Irish Genealogy"
            className="w-12 h-12 object-contain flex-shrink-0 drop-shadow"
          />
          <div>
            <h3 className="text-white font-bold text-base leading-snug drop-shadow">
              {t("heroTitle")}
            </h3>
            <p className="text-green-100 text-xs mt-0.5 drop-shadow">
              {t("heroSubtitle")}
            </p>
          </div>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex-shrink-0 text-xs text-green-100 hover:text-white underline underline-offset-2"
          >
            irishgenealogy.ie ↗
          </a>
        </div>
      </div>

      {/* ── What's available chips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(t.raw("contentItems") as string[]).map((item: string) => (
          <div key={item} className="flex items-center gap-1.5 text-xs text-stone-600 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
            <span className="text-green-600">•</span> {item}
          </div>
        ))}
      </div>

      {/* ── Search form ── */}
      <form onSubmit={handleSubmit} className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-4">

        {/* Name row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-stone-500 mb-1">{t("fieldFirstname")}</label>
            <input
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              placeholder={t("fieldFirstnamePlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-stone-500 mb-1">{t("fieldLastname")}</label>
            <input
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              placeholder={t("fieldLastnamePlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>

        {/* County + year range row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-stone-500 mb-1">{t("fieldLocation")}</label>
            <input
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder={t("fieldLocationPlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs text-stone-500 mb-1">{t("yearFrom")}</label>
              <input
                type="number"
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                placeholder="e.g. 1850"
                min="1600" max="2000"
                className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">{t("yearTo")}</label>
              <input
                type="number"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                placeholder="e.g. 1950"
                min="1600" max="2000"
                className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Record source tabs */}
        <div>
          <label className="block text-xs text-stone-500 mb-1.5">{t("recordSource")}</label>
          <div className="inline-flex rounded-lg border border-stone-300 bg-white overflow-hidden text-sm">
            {(["all", "civil", "church"] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setRecordSource(src)}
                className={`px-3 py-1.5 font-medium transition-colors
                  ${recordSource === src
                    ? "bg-green-700 text-white"
                    : "text-stone-600 hover:bg-stone-50"}`}
              >
                {t(`source_${src}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Event type checkboxes */}
        <div>
          <label className="block text-xs text-stone-500 mb-1.5">{t("eventTypes")}</label>
          <div className="flex flex-wrap gap-2">
            {availableEvents.map((ev) => {
              const active = selectedEvents.has(ev.id);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => toggleEvent(ev.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors
                    ${active
                      ? "bg-green-700 border-green-700 text-white"
                      : "bg-white border-stone-300 text-stone-600 hover:border-stone-400"}`}
                >
                  {ev.emoji} {ev.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("searching")}
              </>
            ) : (
              hasQuery ? t("searchWithFields") : t("searchBrowse")
            )}
          </button>
          <a
            href={buildDirectUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-stone-300 hover:border-stone-400 text-stone-600 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors bg-white"
            title={t("openOnSiteTitle")}
          >
            ↗
          </a>
        </div>
      </form>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {t("errorPrefix")} {error}
        </div>
      )}

      {/* ── Results ── */}
      {results && !loading && (
        <div className="space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500 font-medium">
              {results.totalText}
              {results.totalPages > 1 && (
                <span className="ml-1 text-stone-400">
                  — {t("page")} {currentPage} / {results.totalPages}
                </span>
              )}
            </p>
            <a
              href={results.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-700 hover:underline"
            >
              {t("viewOnSite")} ↗
            </a>
          </div>

          {results.records.length === 0 ? (
            <p className="text-sm text-stone-500 italic text-center py-6">{t("noResults")}</p>
          ) : (
            <>
              <div className="space-y-2">
                {results.records.map((r) => (
                  <RecordCard key={r.recordId} record={r} onSaveAsNote={onSaveAsNote} />
                ))}
              </div>

              {/* Pagination */}
              {showPagination && (
                <div className="flex items-center justify-center gap-1 pt-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => doSearch(currentPage - 1)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 disabled:opacity-40 hover:border-stone-400 bg-white"
                  >
                    ←
                  </button>
                  {pageWindow.map((pg) => (
                    <button
                      key={pg}
                      onClick={() => doSearch(pg)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors
                        ${pg === currentPage
                          ? "bg-green-700 border-green-700 text-white font-medium"
                          : "border-stone-300 hover:border-stone-400 bg-white text-stone-700"}`}
                    >
                      {pg}
                    </button>
                  ))}
                  {totalPages > 7 && currentPage < totalPages - 3 && (
                    <>
                      <span className="text-stone-400 text-xs px-1">…</span>
                      <button
                        onClick={() => doSearch(totalPages)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 hover:border-stone-400 bg-white text-stone-700"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => doSearch(currentPage + 1)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 disabled:opacity-40 hover:border-stone-400 bg-white"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Attribution ── */}
      <p className="text-xs text-stone-400 text-center">
        {t("attribution")}{" "}
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-stone-600"
        >
          irishgenealogy.ie
        </a>
        {" "}— {t("attributionBody")}
      </p>
    </div>
  );
}
