"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import * as api from "@/lib/api";
import WikipediaSearch from "@/components/WikipediaSearch";
import CensusSearch from "@/components/CensusSearch";
import IrishGenealogySearch from "@/components/IrishGenealogySearch";
import AiChat from "@/components/AiChat";
import ResearchNotesPanel, { type NoteDraft } from "@/components/ResearchNotesPanel";
import ContactRequestsPanel from "@/components/ContactRequestsPanel";

// ─── main component ───────────────────────────────────────────────────────────

// All Research tabs are peers: AI Assistant · Wikipedia · Explore · Notes ·
// Contact Requests. Shared tab-button styling.
const tabCls = (active: boolean) =>
  `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
    active ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-500 hover:text-stone-700"
  }`;

export default function ResearchPage() {
  const t = useTranslations("research");
  const tCensus = useTranslations("census");
  const tIrishGenealogy = useTranslations("irishGenealogy");
  const tAi = useTranslations("aiChat");
  const locale = useLocale();
  const { user, roles } = useAuth();
  const { activeTree, isLoading: treeLoading } = useTree();
  const searchParams = useSearchParams();

  // When navigating from a person's detail page, personId is provided as a query param.
  const aiPersonId = searchParams.get("personId") ?? undefined;

  // When there is no URL param, fall back to the last-viewed person stored in localStorage.
  const [localPersonId, setLocalPersonId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (aiPersonId) return; // URL param takes priority
    try {
      const raw = localStorage.getItem("clann_last_person");
      if (raw) setLocalPersonId(JSON.parse(raw).id);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The effective person ID to use for pre-filling search forms.
  const prefillPersonId = aiPersonId ?? localPersonId;

  const [activePanel, setActivePanel] = useState<
    "ai" | "wikipedia" | "census" | "irishGenealogy" | "notes" | "requests"
  >(
    searchParams.get("panel") === "requests"
      ? "requests"
      : searchParams.get("panel") === "ai"
        ? "ai"
        : "notes"
  );
  const [pendingContactCount, setPendingContactCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const poll = () => api.getPendingContactCount().then((r) => setPendingContactCount(r.count)).catch(() => {});
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  // Pre-fill state for "Save as Note" from the AI Advisor / Wikipedia / Irish Genealogy panels
  const [prefill, setPrefill] = useState<NoteDraft | null>(null);
  // Note context injected into AI chat via "Dig deeper"
  const [aiNoteContext, setAiNoteContext] = useState<{ title: string; body: string } | null>(null);
  // Person name pre-fill for Census and Irish Genealogy search (derived from aiPersonId URL param)
  const [censusPersonName, setCensusPersonName] = useState<{ forename: string; surname: string } | null>(null);
  const [irishGenealogyPrefill, setIrishGenealogyPrefill] = useState<{
    forename: string; surname: string;
    yearStart?: string; yearEnd?: string; location?: string;
  } | null>(null);

  const isAdmin = roles.includes("admin");

  // NOTE: Research opens on the notes navigator by default. It used to
  // auto-open the AI panel whenever a personId was present (the nav link
  // carries the last-viewed person), which hid the notes panel entirely — the
  // AI Assistant is now opt-in via its own button. The person context is still
  // captured (below) to pre-fill the AI/Census/Irish forms when opened.

  // Pre-fill Census and Irish Genealogy forms from the effective person ID (URL param or last-viewed).
  // Must pass created_by so the backend ownership filter can find the person (same as useApi.getPerson).
  useEffect(() => {
    if (!prefillPersonId || !user?.username) return;
    api.getPerson(prefillPersonId, user.username).then((person) => {
      const extractYear = (date?: string | null): string => {
        if (!date) return "";
        const m = date.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/);
        return m ? m[1] : "";
      };
      setCensusPersonName({ forename: person.first_name, surname: person.family_name });
      setIrishGenealogyPrefill({
        forename: person.first_name,
        surname: person.family_name,
        yearStart: extractYear(person.date_of_birth),
        yearEnd:   extractYear(person.date_of_death),
        location:  person.place_of_birth ?? "",
      });
    }).catch((err) => console.error("Person pre-fill fetch failed:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillPersonId]);

  // Close Explore dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSaveAsNote(title: string, description: string, body: string) {
    setPrefill({ title, description, body });
    setActivePanel("notes"); // the composer lives in the Notes tab
  }

  function handleDigDeeper(title: string, body: string) {
    setAiNoteContext({ title, body });
    setActivePanel("ai"); // AI Assistant is its own tab now
  }

  if (treeLoading || !user) return null;

  if (!activeTree) {
    return (
      <div className="text-center py-20 text-stone-400">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-lg font-medium text-stone-600">{t("noTreeTitle")}</p>
        <p className="text-sm mt-1">{t("noTreeDescription")}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Research tabs — all peers: AI Assistant · Wikipedia · Explore ·
          Notes · Contact Requests. Notes/Contact Requests sit BESIDE the
          research tools, not under them; Save-as-Note from any tool lands in
          the Notes tab, which lists every note for the tree regardless of
          source. */}
      <div className="flex gap-1 border-b border-stone-200 mb-6 items-center flex-wrap">
        <button onClick={() => setActivePanel("ai")} className={tabCls(activePanel === "ai")}>
          🤖 {tAi("toggle")}
        </button>
        <button onClick={() => setActivePanel("wikipedia")} className={tabCls(activePanel === "wikipedia")}>
          🌐 {t("wikiToggle")}
        </button>
        <div ref={exploreRef} className="relative">
          <button
            onClick={() => setExploreOpen((o) => !o)}
            title={t("exploreTooltip")}
            className={tabCls(activePanel === "census" || activePanel === "irishGenealogy")}
          >
            🗂️ {t("exploreToggle")}
            <svg className={`w-3.5 h-3.5 transition-transform ${exploreOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {exploreOpen && (
            <div className="absolute left-0 mt-1.5 w-52 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              <button
                onClick={() => { setActivePanel("census"); setExploreOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${activePanel === "census" ? "bg-emerald-50 text-emerald-800 font-medium" : "text-stone-700 hover:bg-stone-50"}`}
              >
                <span>📜</span>
                <span>{tCensus("toggle")}</span>
                {activePanel === "census" && <span className="ml-auto text-emerald-600 text-xs">✓</span>}
              </button>
              <button
                onClick={() => { setActivePanel("irishGenealogy"); setExploreOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${activePanel === "irishGenealogy" ? "bg-emerald-50 text-emerald-800 font-medium" : "text-stone-700 hover:bg-stone-50"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.irishgenealogy.ie/app/uploads/2022/01/cropped-IrishGenealogy-logo-32x32.png" alt="" className="w-4 h-4 object-contain" />
                <span>{tIrishGenealogy("toggle")}</span>
                {activePanel === "irishGenealogy" && <span className="ml-auto text-emerald-600 text-xs">✓</span>}
              </button>
            </div>
          )}
        </div>
        <button onClick={() => setActivePanel("notes")} className={tabCls(activePanel === "notes")}>
          📝 {t("panelNotes")}
        </button>
        <button onClick={() => setActivePanel("requests")} className={tabCls(activePanel === "requests")}>
          📬 {t("panelRequests")}
          {pendingContactCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingContactCount}
            </span>
          )}
        </button>
      </div>

      {activePanel === "ai" && (
        <div className="h-[calc(100vh-9rem)] min-h-[600px] bg-white rounded-xl border border-stone-200 p-6 overflow-hidden">
          <AiChat onSaveAsNote={handleSaveAsNote} personId={aiPersonId} noteContext={aiNoteContext} />
        </div>
      )}

      {activePanel === "wikipedia" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <WikipediaSearch onSaveAsNote={handleSaveAsNote} />
        </div>
      )}

      {activePanel === "census" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-stone-800">{tCensus("title")}</h2>
          <CensusSearch
            key={`${censusPersonName?.surname ?? ""}${censusPersonName?.forename ?? ""}`}
            initialForename={censusPersonName?.forename ?? ""}
            initialSurname={censusPersonName?.surname ?? ""}
          />
        </div>
      )}

      {activePanel === "irishGenealogy" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-stone-800">{tIrishGenealogy("title")}</h2>
          <IrishGenealogySearch
            key={`${irishGenealogyPrefill?.surname ?? ""}${irishGenealogyPrefill?.forename ?? ""}${irishGenealogyPrefill?.yearStart ?? ""}`}
            initialForename={irishGenealogyPrefill?.forename ?? ""}
            initialSurname={irishGenealogyPrefill?.surname ?? ""}
            initialYearStart={irishGenealogyPrefill?.yearStart ?? ""}
            initialYearEnd={irishGenealogyPrefill?.yearEnd ?? ""}
            initialLocation={irishGenealogyPrefill?.location ?? ""}
            onSaveAsNote={handleSaveAsNote}
          />
        </div>
      )}

      {activePanel === "requests" && <ContactRequestsPanel />}

      {activePanel === "notes" && (
        // Full-height flex column so the notes panel fills the viewport
        // (navigator left / editor right). `main` isn't height-bounded, so bound
        // it here. No page header — the tab is the heading; Notes is only notes,
        // listing every note for the tree regardless of which tool produced it.
        <div className="flex flex-col h-[calc(100vh-9rem)] min-h-[600px]">
          {prefillPersonId && irishGenealogyPrefill && (
            <div className="mb-4 shrink-0">
              <a
                href={`/${locale}/persons/${prefillPersonId}`}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
              >
                ← 🌳 {irishGenealogyPrefill.forename} {irishGenealogyPrefill.surname}
              </a>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ResearchNotesPanel
              activeTree={activeTree}
              isAdmin={isAdmin}
              initialDraft={prefill}
              onInitialDraftConsumed={() => setPrefill(null)}
              onDigDeeper={handleDigDeeper}
            />
          </div>
        </div>
      )}
    </div>
  );
}
