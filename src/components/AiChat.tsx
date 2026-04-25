"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

function getTextFromMessage(msg: UIMessage): string {
  return msg.parts.filter(isTextUIPart).map((p) => p.text).join("");
}

interface AiChatProps {
  onSaveAsNote: (title: string, description: string, body: string) => void;
}

export default function AiChat({ onSaveAsNote }: AiChatProps) {
  const { token } = useAuth();
  const t = useTranslations("aiChat");
  const locale = useLocale();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasSettings, setHasSettings] = useState<boolean | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [input, setInput] = useState("");

  // Keep token in a ref so the transport function always uses the latest value.
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Create the transport once; use a function for headers so it reads the current ref.
  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/ai/chat",
      headers: () => ({ Authorization: `Bearer ${tokenRef.current ?? ""}` }),
    }),
  ).current;

  const { messages, sendMessage, status, setMessages, error } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!token) return;
    fetch("/api/ai/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setHasSettings(!!data))
      .catch(() => setHasSettings(false))
      .finally(() => setSettingsLoading(false));
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  function fillSuggestion(text: string) {
    setInput(text);
  }

  if (settingsLoading) {
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

  return (
    <div className="flex flex-col h-full min-h-96">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="text-base font-semibold text-stone-800">{t("title")}</h2>
        </div>
        {messages.length > 0 && (
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.filter((m) => m.role !== "system").length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-3">🌳</span>
            <p className="text-sm text-stone-500 max-w-xs">{t("emptyPrompt")}</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {(t.raw("suggestions") as string[]).map((suggestion: string) => (
                <button
                  key={suggestion}
                  onClick={() => fillSuggestion(suggestion)}
                  className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages
          .filter((m) => m.role !== "system")
          .map((m) => (
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

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("inputPlaceholder")}
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
    </div>
  );
}
