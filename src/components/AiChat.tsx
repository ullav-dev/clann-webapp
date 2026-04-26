"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useTree } from "@/contexts/TreeContext";
import { fullName } from "@/components/PersonCard";
import Link from "next/link";
import type { Person, RelationshipsResponse, SpouseInfo } from "@/lib/types";

// ─── context formatting ───────────────────────────────────────────────────────

function personName(p: Person | SpouseInfo) {
  return fullName(p) || "Unknown";
}

function formatPersonContext(person: Person, rels: RelationshipsResponse): string {
  const lines: string[] = [`Person being researched: ${personName(person)}`];
  lines.push(`Sex: ${person.sex}`);

  if (person.date_of_birth)
    lines.push(`Born: ${person.date_of_birth}${person.place_of_birth ? `, ${person.place_of_birth}` : ""}`);
  if (person.date_of_death)
    lines.push(`Died: ${person.date_of_death}${person.place_of_death ? `, ${person.place_of_death}` : ""}`);

  if (person.biography) {
    const bio = person.biography.length > 600
      ? person.biography.slice(0, 600) + "…"
      : person.biography;
    lines.push(`Biography: ${bio}`);
  }

  lines.push("", "Known relationships:");

  if (rels.father.length)
    lines.push(`- Father: ${rels.father.map(personName).join(", ")}`);
  if (rels.mother.length)
    lines.push(`- Mother: ${rels.mother.map(personName).join(", ")}`);
  if (rels.spouse.length) {
    const spouseText = rels.spouse.map((s) => {
      const dates = [s.spouse_from, s.spouse_to].filter(Boolean).join("–");
      return dates ? `${personName(s)} (${dates})` : personName(s);
    });
    lines.push(`- Spouse(s): ${spouseText.join(", ")}`);
  }
  if (rels.siblings.length)
    lines.push(`- Siblings: ${rels.siblings.map(personName).join(", ")}`);

  return lines.join("\n");
}

function formatTreeContext(persons: Person[], treeName?: string): string {
  const label = treeName ? `"${treeName}"` : "active tree";
  const MAX = 60;
  const shown = persons.slice(0, MAX);
  const truncated = persons.length > MAX;

  const header = `Family tree — ${label} (${persons.length} people):`;
  const rows = shown.map((p) => {
    const dates = [p.date_of_birth, p.date_of_death].filter(Boolean).join("–");
    const place = p.place_of_birth ?? p.place_of_death ?? "";
    const meta = [dates, place].filter(Boolean).join(", ");
    return `- ${personName(p)} (${p.sex}${meta ? `, ${meta}` : ""})`;
  });
  if (truncated) rows.push(`…and ${persons.length - MAX} more`);

  return [header, ...rows].join("\n");
}

function getTextFromMessage(msg: UIMessage): string {
  return msg.parts.filter(isTextUIPart).map((p) => p.text).join("");
}

// ─── prompt templates ─────────────────────────────────────────────────────────

interface TemplateCategory {
  key: string;
  icon: string;
  prompts: string[];
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    key: "Records",
    icon: "📜",
    prompts: [
      "What civil registration records exist in Ireland for births, deaths, and marriages, and from what year?",
      "What Irish census records are available online and for which years?",
      "What does the Griffith's Valuation record and how can I use it to find ancestors?",
      "What records are held in the National Archives of Ireland and how do I access them?",
      "Where can I find Catholic parish registers for pre-famine Ireland?",
    ],
  },
  {
    key: "Names",
    icon: "🔤",
    prompts: [
      "What are common spelling variants and anglicisations of Irish surnames?",
      "How were Irish children typically named in the 19th century?",
      "What is the Irish language origin of common Irish surnames?",
    ],
  },
  {
    key: "Emigration",
    icon: "🌍",
    prompts: [
      "What records exist for Irish emigrants to the USA in the 1840s–1880s?",
      "What ships commonly carried Irish emigrants, and where can I find passenger lists?",
      "How do I trace an Irish ancestor who emigrated to England or Scotland?",
    ],
  },
  {
    key: "Strategy",
    icon: "🧭",
    prompts: [
      "How do I research an ancestor born before civil registration in Ireland (pre-1864)?",
      "How do I break through a research brick wall when records are missing?",
      "What is the best order to search records when starting Irish genealogy research?",
    ],
  },
  {
    key: "History",
    icon: "🏺",
    prompts: [
      "What was life like for a rural Irish family in the mid-1800s?",
      "How did the Great Famine of 1845–1852 affect Irish families and records?",
      "What historical events most disrupted Irish records and genealogy?",
    ],
  },
  {
    key: "Dna",
    icon: "🧬",
    prompts: [
      "How can I use DNA results to confirm an Irish ancestral connection?",
      "What is a centimorgan and how much DNA should I share with a first or second cousin?",
      "How do I use DNA matches to break through a brick wall in Irish research?",
    ],
  },
];

const PERSON_TEMPLATE_PROMPTS = [
  "Suggest a research strategy for tracing {personName}'s ancestors",
  "What records might document {personName}'s life and family?",
  "What historical events would have shaped {personName}'s life?",
];

// ─── component ────────────────────────────────────────────────────────────────

interface AiChatProps {
  onSaveAsNote: (title: string, description: string, body: string) => void;
  /** rawId (no "person:" prefix) — when provided, auto-loads person context */
  personId?: string;
}

export default function AiChat({ onSaveAsNote, personId }: AiChatProps) {
  const { token } = useAuth();
  const t = useTranslations("aiChat");
  const locale = useLocale();
  const api = useApi();
  const { activeTree } = useTree();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Settings check
  const [hasSettings, setHasSettings] = useState<boolean | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Person context (loaded when personId prop is provided)
  const [personCtx, setPersonCtx] = useState<{ person: Person; rels: RelationshipsResponse } | null>(null);
  const [personCtxLoading, setPersonCtxLoading] = useState(false);

  // Tree context (loaded on demand via toggle)
  const [treeEnabled, setTreeEnabled] = useState(false);
  const [treePersons, setTreePersons] = useState<Person[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  // Refs so the transport body function always reads the latest context values.
  const tokenRef = useRef(token);
  const personContextStringRef = useRef<string | undefined>(undefined);
  const treeContextStringRef = useRef<string | undefined>(undefined);

  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    personContextStringRef.current = personCtx
      ? formatPersonContext(personCtx.person, personCtx.rels)
      : undefined;
  }, [personCtx]);

  useEffect(() => {
    treeContextStringRef.current =
      treeEnabled && treePersons
        ? formatTreeContext(treePersons, activeTree?.display_name)
        : undefined;
  }, [treeEnabled, treePersons, activeTree]);

  // Created once — body function reads current ref values at send time.
  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/ai/chat",
      headers: () => ({ Authorization: `Bearer ${tokenRef.current ?? ""}` }),
      body: () => ({
        personContext: personContextStringRef.current,
        treeContext: treeContextStringRef.current,
      }),
    }),
  ).current;

  const { messages, sendMessage, status, setMessages, error } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";

  // Check if AI settings are configured.
  useEffect(() => {
    if (!token) return;
    fetch("/api/ai/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setHasSettings(!!data))
      .catch(() => setHasSettings(false))
      .finally(() => setSettingsLoading(false));
  }, [token]);

  // Load person context when personId is provided.
  useEffect(() => {
    if (!personId) return;
    setPersonCtxLoading(true);
    Promise.all([api.getPerson(personId), api.getRelationships(personId)])
      .then(([person, rels]) => setPersonCtx({ person, rels }))
      .catch(() => {})
      .finally(() => setPersonCtxLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  // Load tree persons on first toggle.
  const loadTreePersons = useCallback(async () => {
    if (treePersons !== null) return; // already loaded
    setTreeLoading(true);
    try {
      const persons = await api.listPersons();
      setTreePersons(persons);
    } finally {
      setTreeLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treePersons]);

  async function handleTreeToggle() {
    const next = !treeEnabled;
    setTreeEnabled(next);
    if (next) await loadTreePersons();
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function categoryLabel(key: string): string {
    const map: Record<string, string> = {
      Records: t("templatesCategoryRecords"),
      Names: t("templatesCategoryNames"),
      Emigration: t("templatesCategoryEmigration"),
      Strategy: t("templatesCategoryStrategy"),
      History: t("templatesCategoryHistory"),
      Dna: t("templatesCategoryDna"),
    };
    return map[key] ?? key;
  }

  function handleTemplateClick(prompt: string) {
    const filled = personCtx
      ? prompt.replace("{personName}", personName(personCtx.person))
      : prompt.replace("{personName}", "this person");
    setInput(filled);
    setTemplatesOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  }

  function handleSaveMessage(msg: UIMessage) {
    const date = new Date().toLocaleDateString();
    onSaveAsNote(
      t("savedNoteTitle", { date }),
      t("savedNoteDescription"),
      getTextFromMessage(msg),
    );
  }

  function handleSaveConversation() {
    const date = new Date().toLocaleDateString();
    const body = messages
      .filter((m) => m.role !== "system")
      .map((m) =>
        m.role === "user"
          ? `**${t("youLabel")}:** ${getTextFromMessage(m)}`
          : `**${t("aiLabel")}:** ${getTextFromMessage(m)}`,
      )
      .join("\n\n---\n\n");
    onSaveAsNote(
      t("savedConversationTitle", { date }),
      t("savedConversationDescription"),
      body,
    );
  }

  // ── loading / empty states ────────────────────────────────────────────────

  if (settingsLoading || personCtxLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-48">
        <span className="text-sm text-stone-400">{t("loading")}</span>
      </div>
    );
  }

  if (hasSettings === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-48 text-center px-6 py-12">
        <span className="text-4xl mb-4">🤖</span>
        <p className="text-sm font-medium text-stone-700 mb-1">{t("noSettings")}</p>
        <p className="text-xs text-stone-400 mb-4">{t("noSettingsHint")}</p>
        <Link
          href={`/${locale}/settings`}
          className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
        >
          {t("goToSettings")} →
        </Link>
      </div>
    );
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-96">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="text-base font-semibold text-stone-800">{t("title")}</h2>
        </div>
        {visibleMessages.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMessages([])}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              {t("clearChat")}
            </button>
            <button
              onClick={handleSaveConversation}
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
            >
              {t("saveConversation")}
            </button>
          </div>
        )}
      </div>

      {/* Context badges */}
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        {/* Person context badge */}
        {personCtx && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2.5 py-1">
            👤 {t("personContextBadge", { name: personName(personCtx.person) })}
          </span>
        )}

        {/* Tree context toggle */}
        <button
          onClick={handleTreeToggle}
          disabled={treeLoading}
          className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors ${
            treeEnabled
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : "bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700"
          }`}
        >
          {treeLoading ? (
            <span className="animate-pulse">{t("treeContextLoading")}</span>
          ) : treeEnabled && treePersons ? (
            <>🌳 {t("treeContextBadge", { count: treePersons.length })}</>
          ) : (
            <>🌳 {t("treeContextToggle")}</>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            {personCtx ? (
              <>
                <span className="text-3xl mb-3">👤</span>
                <p className="text-sm text-stone-600 font-medium mb-1">
                  {t("personContextReady", { name: personName(personCtx.person) })}
                </p>
                <p className="text-xs text-stone-400 max-w-xs">{t("personContextHint")}</p>
              </>
            ) : (
              <>
                <span className="text-3xl mb-3">🌳</span>
                <p className="text-sm text-stone-500 max-w-xs">{t("emptyPrompt")}</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {(t.raw("suggestions") as string[]).map((suggestion: string) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full transition-colors text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {visibleMessages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "bg-emerald-700 text-white"
                  : "bg-stone-100 text-stone-800"
              }`}
            >
              {m.role === "assistant" ? (
                <>
                  <div className="prose prose-stone prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {getTextFromMessage(m)}
                    </ReactMarkdown>
                  </div>
                  <button
                    onClick={() => handleSaveMessage(m)}
                    className="mt-2 text-xs text-stone-400 hover:text-emerald-700 transition-colors flex items-center gap-1"
                  >
                    📋 {t("saveAsNote")}
                  </button>
                </>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{getTextFromMessage(m)}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 rounded-2xl px-4 py-3">
              <span className="flex gap-1 items-center h-5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Templates panel */}
      {templatesOpen && (
        <div className="shrink-0 mb-2 max-h-52 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50">
          <div className="p-2 space-y-3">
            {personCtx && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 px-1 mb-1">
                  👤 {t("templatesCategoryPerson")}
                </p>
                <div className="space-y-0.5">
                  {PERSON_TEMPLATE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleTemplateClick(prompt)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-stone-200 text-stone-700 transition-colors"
                    >
                      {prompt.replace("{personName}", personName(personCtx.person))}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat.key}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 px-1 mb-1">
                  {cat.icon} {categoryLabel(cat.key)}
                </p>
                <div className="space-y-0.5">
                  {cat.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleTemplateClick(prompt)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-stone-200 text-stone-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            personCtx
              ? t("inputPlaceholderPerson", { name: personName(personCtx.person) })
              : t("inputPlaceholder")
          }
          disabled={isLoading}
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          {t("send")}
        </button>
      </form>
      <div className="flex justify-start mt-1.5 shrink-0">
        <button
          onClick={() => setTemplatesOpen((o) => !o)}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1"
        >
          📋 {templatesOpen ? t("templatesHide") : t("templates")}
        </button>
      </div>
    </div>
  );
}
