"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";

// ─── Wikipedia REST API types ─────────────────────────────────────────────────

interface WikiSearchResult {
  key: string;
  title: string;
  excerpt: string;
  description?: string;
  thumbnail?: { url: string; width: number; height: number };
}

interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls: { desktop: { page: string } };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function wikiLang(locale: string): string {
  const map: Record<string, string> = { en: "en", de: "de", ga: "ga" };
  return map[locale] ?? "en";
}

function searchUrl(lang: string, query: string): string {
  return `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=10`;
}

function summaryUrl(lang: string, key: string): string {
  return `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`;
}

function buildNoteBody(summary: WikiSummary): string {
  const url = summary.content_urls.desktop.page;
  return `${summary.extract}\n\n*Source: [${summary.title} on Wikipedia](${url})*`;
}

// ─── result card ─────────────────────────────────────────────────────────────

function ResultCard({
  result,
  selected,
  onClick,
}: {
  result: WikiSearchResult;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        selected
          ? "border-blue-400 bg-blue-50"
          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {result.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnail.url}
            alt=""
            className="w-12 h-12 object-cover rounded shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{result.title}</p>
          {result.description && (
            <p className="text-xs text-stone-500 mt-0.5 truncate">{result.description}</p>
          )}
          {result.excerpt && (
            <p
              className="text-xs text-stone-500 mt-1 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: result.excerpt }}
            />
          )}
        </div>
      </div>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  onSaveAsNote: (title: string, description: string, body: string) => void;
}

export default function WikipediaSearch({ onSaveAsNote }: Props) {
  const t = useTranslations("research");
  const locale = useLocale();
  const lang = wikiLang(locale);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<WikiSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      setSelectedKey(null);
      setSummary(null);
      try {
        const url = searchUrl(lang, query.trim());
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResults(data.pages ?? []);
      } catch {
        setSearchError(t("wikiSearchFailed"));
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lang]);

  async function handleSelectResult(result: WikiSearchResult) {
    setSelectedKey(result.key);
    setSummary(null);
    setLoadingSummary(true);
    try {
      const url = summaryUrl(lang, result.key);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WikiSummary = await res.json();
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }

  function handleSaveAsNote() {
    if (!summary) return;
    const wikiUrl = summary.content_urls.desktop.page;
    onSaveAsNote(summary.title, wikiUrl, buildNoteBody(summary));
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("wikiSearchPlaceholder")}
          className="w-full rounded-lg border border-stone-300 pl-8 pr-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          autoFocus
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 animate-pulse">
            {t("wikiSearching")}
          </span>
        )}
      </div>

      {searchError && (
        <p className="text-xs text-red-500">{searchError}</p>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Results list */}
        {results.length > 0 && (
          <div className="w-64 shrink-0 space-y-2 overflow-y-auto pr-1">
            {results.map((r) => (
              <ResultCard
                key={r.key}
                result={r}
                selected={selectedKey === r.key}
                onClick={() => handleSelectResult(r)}
              />
            ))}
          </div>
        )}

        {/* Summary panel */}
        <div className="flex-1 min-w-0">
          {loadingSummary && (
            <div className="flex items-center justify-center h-32 text-stone-400 text-sm">
              {t("wikiLoading")}
            </div>
          )}

          {!loadingSummary && summary && (
            <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="flex items-start gap-4">
                {summary.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={summary.thumbnail.source}
                    alt={summary.title}
                    className="w-24 h-24 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-stone-800 text-base">{summary.title}</h3>
                  <a
                    href={summary.content_urls.desktop.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-0.5 block"
                  >
                    {t("wikiOpenInWikipedia")} ↗
                  </a>
                </div>
              </div>

              <p className="text-sm text-stone-700 leading-relaxed">{summary.extract}</p>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <a
                  href={summary.content_urls.desktop.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t("wikiOpenInWikipedia")} ↗
                </a>
                <button
                  onClick={handleSaveAsNote}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t("wikiSaveAsNote")}
                </button>
              </div>
            </div>
          )}

          {!loadingSummary && !summary && !selectedKey && results.length > 0 && (
            <div className="flex items-center justify-center h-32 text-stone-400 text-sm">
              {t("wikiSelectResult")}
            </div>
          )}

          {!loadingSummary && !summary && results.length === 0 && query.trim() && !searching && (
            <div className="flex items-center justify-center h-32 text-stone-400 text-sm">
              {t("wikiNoResults")}
            </div>
          )}

          {!query.trim() && (
            <div className="flex flex-col items-center justify-center h-32 text-stone-400">
              <span className="text-3xl mb-2">🌐</span>
              <p className="text-sm">{t("wikiPrompt")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
