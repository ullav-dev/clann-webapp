"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import type { Person, MergeContactRequest, DuplicateSearchResult, DuplicateMatch } from "@/lib/types";
import { useLocale } from "next-intl";

interface Props {
  person: Person;
}

function StatusBadge({ status }: { status: MergeContactRequest["status"] }) {
  const t = useTranslations("duplicateFinder");
  const cls =
    status === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : status === "ignored"
      ? "bg-stone-100 text-stone-600"
      : "bg-amber-100 text-amber-800";
  const label =
    status === "accepted"
      ? t("statusAccepted")
      : status === "ignored"
      ? t("statusIgnored")
      : t("statusPending");
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cls =
    confidence === "strong"
      ? "bg-red-100 text-red-800"
      : confidence === "likely"
      ? "bg-amber-100 text-amber-800"
      : "bg-stone-100 text-stone-600";
  const label =
    confidence === "strong" ? "Strong match" : confidence === "likely" ? "Likely match" : "Possible match";
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function MatchCard({
  match,
  alreadySent,
  isExpanded,
  onExpand,
  onSend,
  sending,
  sendError,
}: {
  match: DuplicateMatch;
  alreadySent: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onSend: (msg: string) => void;
  sending: boolean;
  sendError: string | null;
}) {
  const [message, setMessage] = useState("");

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-stone-800">
              {match.first_name} {match.family_name}
            </span>
            <ConfidenceBadge confidence={match.confidence} />
            {match.is_own && (
              <span className="text-xs text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">Your tree</span>
            )}
          </div>
          <div className="text-xs text-stone-500 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>Tree: <span className="font-medium text-stone-700">{match.tree}</span></span>
            {!match.is_own && (
              <span>Owner: <span className="font-medium text-stone-700">@{match.owner}</span></span>
            )}
            {match.sex && <span>{match.sex}</span>}
            {match.date_of_birth && <span>b. {match.date_of_birth}</span>}
            {match.place_of_birth && <span>{match.place_of_birth}</span>}
          </div>
        </div>

        <div className="shrink-0">
          {match.is_own ? (
            <span className="text-xs text-stone-500 italic">Same owner</span>
          ) : alreadySent ? (
            <span className="text-xs text-emerald-700 font-medium">✓ Sent</span>
          ) : (
            <button
              onClick={onExpand}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              {isExpanded ? "Cancel" : "Contact"}
            </button>
          )}
        </div>
      </div>

      {isExpanded && !match.is_own && !alreadySent && (
        <div className="flex flex-col gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)…"
            rows={2}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
          {sendError && <p className="text-xs text-red-600">{sendError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => onSend(message)}
              disabled={sending}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DuplicateFinderTab({ person }: Props) {
  const t = useTranslations("duplicateFinder");
  const { user } = useAuth();
  const locale = useLocale();

  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<DuplicateSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [expandedProxy, setExpandedProxy] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});

  const [sentRequests, setSentRequests] = useState<MergeContactRequest[]>([]);

  const rawProxyId = api.rawId(person.id);

  useEffect(() => {
    api.listContactRequests("sent").then((all) => {
      setSentRequests(all.filter((r) => r.from_proxy_id === person.id || r.from_proxy_id === `person_proxy:${rawProxyId}`));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person.id]);

  async function handleSearch() {
    setSearching(true);
    setSearchError(null);
    setResult(null);
    try {
      const r = await api.findDuplicates(rawProxyId);
      setResult(r);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleSend(match: DuplicateMatch, message: string) {
    setSending(true);
    setSendErrors((prev) => { const n = { ...prev }; delete n[match.proxy_id]; return n; });
    try {
      await api.createContactRequests(person.id, [match.owner], message || undefined);
      setSentTo((prev) => new Set([...prev, match.owner]));
      setExpandedProxy(null);
      const all = await api.listContactRequests("sent");
      setSentRequests(all.filter((r) => r.from_proxy_id === person.id || r.from_proxy_id === `person_proxy:${rawProxyId}`));
    } catch (e) {
      setSendErrors((prev) => ({ ...prev, [match.proxy_id]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setSending(false);
    }
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 py-4 px-2">
      <div className="rounded-xl border border-stone-200 p-5 bg-white space-y-4">
        <div>
          <h3 className="font-semibold text-stone-800 text-base">{t("searchHeading")}</h3>
          <p className="text-sm text-stone-500 mt-0.5">{t("searchHint")}</p>
        </div>

        {!result && !searching && (
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🔍 {t("searchButton")}
          </button>
        )}

        {searching && (
          <p className="text-sm text-stone-500 animate-pulse">{t("searching")}</p>
        )}

        {searchError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {searchError}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.count === 0 ? (
              <p className="text-sm text-stone-500">{t("noMatches")}</p>
            ) : (
              <>
                <p className="text-sm text-stone-700 font-medium">
                  {t("matchesFound", { count: result.count })}
                </p>
                <div className="space-y-3">
                  {result.matches.map((match) => {
                    const alreadySent = sentTo.has(match.owner) || sentRequests.some((r) => r.to_user === match.owner);
                    return (
                      <MatchCard
                        key={match.proxy_id}
                        match={match}
                        alreadySent={alreadySent}
                        isExpanded={expandedProxy === match.proxy_id}
                        onExpand={() => setExpandedProxy(expandedProxy === match.proxy_id ? null : match.proxy_id)}
                        onSend={(msg) => handleSend(match, msg)}
                        sending={sending && expandedProxy === match.proxy_id}
                        sendError={sendErrors[match.proxy_id] ?? null}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <button
              onClick={() => { setResult(null); setExpandedProxy(null); }}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              ↺ {t("searchAgain")}
            </button>
          </div>
        )}
      </div>

      {sentRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-stone-700 text-sm uppercase tracking-wide">{t("sentRequests")}</h3>
          {sentRequests.map((req) => (
            <div key={req.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-stone-800">@{req.to_user}</p>
                <p className="text-xs text-stone-500">{formatDate(req.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={req.status} />
                {req.status === "accepted" && (
                  <a
                    href={`/${locale}/research?panel=requests`}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
                  >
                    {t("viewConversation")} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sentRequests.length === 0 && result === null && (
        <p className="text-sm text-stone-400 text-center py-4">{t("noSentRequests")}</p>
      )}
    </div>
  );
}
