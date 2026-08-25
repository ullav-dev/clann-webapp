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

  const [activePanel, setActivePanel] = useState<"notes" | "requests">(
    searchParams.get("panel") === "requests" ? "requests" : "notes"
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

  const [mode, setMode] = useState<"wikipedia" | "census" | "irishGenealogy" | "ai" | null>(null);
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

  // Auto-open AI panel when arriving from a person's detail page.
  useEffect(() => {
    if (aiPersonId) setMode("ai");
  }, [aiPersonId]);

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
    setMode(null);
  }

  function handleDigDeeper(title: string, body: string) {
    setAiNoteContext({ title, body });
    setMode("ai");
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

  const rightPanel = () => {
    if (mode === "ai") {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6 h-full">
          <AiChat onSaveAsNote={handleSaveAsNote} personId={aiPersonId} noteContext={aiNoteContext} />
        </div>
      );
    }

    if (mode === "wikipedia") {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <WikipediaSearch onSaveAsNote={handleSaveAsNote} />
        </div>
      );
    }

    if (mode === "census") {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-stone-800">{tCensus("title")}</h2>
          <CensusSearch
            key={`${censusPersonName?.surname ?? ""}${censusPersonName?.forename ?? ""}`}
            initialForename={censusPersonName?.forename ?? ""}
            initialSurname={censusPersonName?.surname ?? ""}
          />
        </div>
      );
    }

    if (mode === "irishGenealogy") {
      return (
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
      );
    }

    return null; // mode === null: the Notes panel itself, rendered below
  };

  return (
    <div>
      {/* Top-level panel switcher: Notes | Contact Requests */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {(["notes", "requests"] as const).map((panel) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              activePanel === panel
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {panel === "notes" ? `📝 ${t("panelNotes")}` : `📬 ${t("panelRequests")}`}
            {panel === "requests" && pendingContactCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingContactCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activePanel === "requests" && <ContactRequestsPanel />}

      {activePanel === "notes" && <>

      {/* Back-to-tree breadcrumb — shown whenever we have a person context (URL param or last-viewed) */}
      {prefillPersonId && irishGenealogyPrefill && (
        <div className="mb-4">
          <a
            href={`/${locale}/persons/${prefillPersonId}`}
            className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
          >
            ← 🌳 {irishGenealogyPrefill.forename} {irishGenealogyPrefill.surname}
          </a>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => {
              if (mode === "ai") { setMode(null); setAiNoteContext(null); }
              else setMode("ai");
            }}
            title={tAi("toggleTooltip")}
            className={`inline-flex items-center gap-1.5 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border ${
              mode === "ai"
                ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
            }`}
          >
            🤖 {tAi("toggle")}
          </button>
          <button
            onClick={() => setMode(mode === "wikipedia" ? null : "wikipedia")}
            className={`inline-flex items-center gap-1.5 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border ${
              mode === "wikipedia"
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
            }`}
          >
            🌐 {t("wikiToggle")}
          </button>
          {/* Explore dropdown */}
          <div ref={exploreRef} className="relative">
            <button
              onClick={() => setExploreOpen((o) => !o)}
              title={t("exploreTooltip")}
              className={`inline-flex items-center gap-1.5 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border ${
                mode === "census" || mode === "irishGenealogy"
                  ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                  : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
              }`}
            >
              🗂️ {t("exploreToggle")}
              <svg className={`w-3.5 h-3.5 transition-transform ${exploreOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {exploreOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setMode(mode === "census" ? null : "census"); setExploreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    mode === "census"
                      ? "bg-emerald-50 text-emerald-800 font-medium"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span>📜</span>
                  <span>{tCensus("toggle")}</span>
                  {mode === "census" && <span className="ml-auto text-emerald-600 text-xs">✓</span>}
                </button>
                <button
                  onClick={() => { setMode(mode === "irishGenealogy" ? null : "irishGenealogy"); setExploreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    mode === "irishGenealogy"
                      ? "bg-emerald-50 text-emerald-800 font-medium"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://www.irishgenealogy.ie/app/uploads/2022/01/cropped-IrishGenealogy-logo-32x32.png" alt="" className="w-4 h-4 object-contain" />
                  <span>{tIrishGenealogy("toggle")}</span>
                  {mode === "irishGenealogy" && <span className="ml-auto text-emerald-600 text-xs">✓</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mode ? (
        rightPanel()
      ) : (
        <ResearchNotesPanel
          activeTree={activeTree}
          isAdmin={isAdmin}
          initialDraft={prefill}
          onInitialDraftConsumed={() => setPrefill(null)}
          onDigDeeper={handleDigDeeper}
        />
      )}
      </>}
    </div>
  );
}
