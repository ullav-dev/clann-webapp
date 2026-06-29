"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import type { MergeContactRequest, ContactMessage } from "@/lib/types";

function StatusBadge({ status }: { status: MergeContactRequest["status"] }) {
  const t = useTranslations("contactRequests");
  const cls =
    status === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : status === "ignored"
      ? "bg-stone-100 text-stone-500"
      : "bg-amber-100 text-amber-800";
  const label =
    status === "accepted" ? t("statusAccepted") : status === "ignored" ? t("statusIgnored") : t("statusPending");
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

function MessageThread({ request, onUpdated }: { request: MergeContactRequest; onUpdated: (r: MergeContactRequest) => void }) {
  const t = useTranslations("contactRequests");
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [request.messages]);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const updated = await api.appendContactMessage(request.id, text.trim());
      onUpdated(updated);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <div className="mt-3 border-t border-stone-100 pt-3 space-y-3">
      {request.initial_message && (
        <div className="text-xs text-stone-500 italic border-l-2 border-stone-200 pl-2">
          {t("initialMessage")}: {request.initial_message}
        </div>
      )}

      {request.messages.length === 0 ? (
        <p className="text-xs text-stone-400">{t("noMessages")}</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {request.messages.map((msg: ContactMessage, i: number) => {
            const isMe = msg.from_user === user?.username;
            return (
              <div key={i} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? "bg-emerald-700 text-white" : "bg-stone-200 text-stone-700"}`}>
                  {msg.from_user[0]?.toUpperCase()}
                </div>
                <div className={`max-w-xs ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`rounded-xl px-3 py-2 text-sm ${isMe ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-800"}`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-0.5 px-1">{formatTime(msg.sent_at)}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t("messagePlaceholder")}
          className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {t("sendMessage")}
        </button>
      </div>
    </div>
  );
}

function RequestCard({
  request,
  currentUser,
  onUpdated,
}: {
  request: MergeContactRequest;
  currentUser: string;
  onUpdated: (r: MergeContactRequest) => void;
}) {
  const t = useTranslations("contactRequests");
  const [acting, setActing] = useState<"accepting" | "ignoring" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(false);

  const isReceived = request.to_user === currentUser;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  async function handleAccept() {
    setActing("accepting");
    setError(null);
    try {
      const updated = await api.acceptContactRequest(request.id);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  }

  async function handleIgnore() {
    setActing("ignoring");
    setError(null);
    try {
      const updated = await api.ignoreContactRequest(request.id);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-medium text-stone-800">
            {isReceived
              ? t("receivedFrom", { username: request.from_user })
              : t("sentTo", { username: request.to_user })}
          </p>
          {request.initial_message && (
            <p className="text-sm text-stone-500 truncate">{request.initial_message}</p>
          )}
          <p className="text-xs text-stone-400">{formatDate(request.created_at)}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        {isReceived && request.status === "pending" && (
          <>
            <button
              onClick={handleAccept}
              disabled={!!acting}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {acting === "accepting" ? t("accepting") : t("accept")}
            </button>
            <button
              onClick={handleIgnore}
              disabled={!!acting}
              className="border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:opacity-60 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {acting === "ignoring" ? t("ignoring") : t("ignore")}
            </button>
          </>
        )}

        {request.status === "accepted" && (
          <button
            onClick={() => setShowThread((v) => !v)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
          >
            {showThread ? t("hideConversation") : t("viewConversation")}
          </button>
        )}
      </div>

      {showThread && request.status === "accepted" && (
        <MessageThread request={request} onUpdated={onUpdated} />
      )}
    </div>
  );
}

export default function ContactRequestsPanel() {
  const t = useTranslations("contactRequests");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [requests, setRequests] = useState<MergeContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all = await api.listContactRequests();
      setRequests(all);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  function handleUpdated(updated: MergeContactRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  if (!user) return null;

  const received = requests.filter((r) => r.to_user === user.username);
  const sent = requests.filter((r) => r.from_user === user.username);
  const pendingCount = received.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-stone-800">{t("title")}</h2>
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">
            {pendingCount}
          </span>
        )}
      </div>

      <div className="flex border-b border-stone-200 gap-4">
        {(["received", "sent"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab === "received" ? t("tabReceived") : t("tabSent")}
            {tab === "received" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-stone-400 animate-pulse py-4 text-center">{t("loading")}</p>
      ) : activeTab === "received" ? (
        received.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-stone-400">
            <span className="text-4xl mb-3">📬</span>
            <p className="text-sm">{t("noReceived")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {received.map((req) => (
              <RequestCard key={req.id} request={req} currentUser={user.username} onUpdated={handleUpdated} />
            ))}
          </div>
        )
      ) : sent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
          <span className="text-4xl mb-3">📤</span>
          <p className="text-sm">{t("noSent")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sent.map((req) => (
            <RequestCard key={req.id} request={req} currentUser={user.username} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
