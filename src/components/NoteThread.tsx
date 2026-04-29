"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import type { ResearchNote } from "@/lib/types";
import AuthorChip from "@/components/AuthorChip";

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

interface Props {
  note: ResearchNote;
}

export default function NoteThread({ note }: Props) {
  const t = useTranslations("research");
  const { user } = useAuth();
  const api = useApi();

  const [replies, setReplies] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReplies([]);
    api.listNoteReplies(note.id)
      .then((data) => { if (!cancelled) setReplies(data); })
      .catch(() => { /* endpoint not yet available — show empty state */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  useEffect(() => {
    if (showForm) textareaRef.current?.focus();
  }, [showForm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const reply = await api.createNoteReply(note.id, draft.trim());
      setReplies((prev) => [...prev, reply]);
      setDraft("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const canReply = !!user && note.is_shared;

  return (
    <div className="border-t border-stone-100 pt-4 mt-2 space-y-4">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
        {t("replies")}
        {replies.length > 0 && (
          <span className="ml-1.5 text-stone-400 normal-case font-normal">({replies.length})</span>
        )}
      </h3>

      {loading ? (
        <p className="text-xs text-stone-400">{t("loading")}</p>
      ) : replies.length === 0 && !showForm ? (
        <p className="text-xs text-stone-400 italic">{t("noReplies")}</p>
      ) : (
        <div className="space-y-4">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <div className="shrink-0 pt-0.5">
                <AuthorChip
                  username={reply.created_by ?? "?"}
                  isSelf={reply.created_by === user?.username}
                  size="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-stone-400">{formatRelative(reply.created_at)}</span>
                </div>
                {reply.body ? (
                  <div className="prose prose-stone prose-xs max-w-none text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
                    >
                      {reply.body}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 italic">—</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canReply && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs font-medium text-violet-700 hover:text-violet-900 transition-colors"
        >
          + {t("reply")}
        </button>
      )}

      {canReply && showForm && (
        <form onSubmit={handleSubmit} className="space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 items-start">
            <div className="shrink-0 pt-1">
              <AuthorChip username={user!.username} isSelf size="sm" />
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("replyPlaceholder")}
              rows={3}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setDraft(""); setError(null); }}
              className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded transition-colors"
            >
              {t("cancelReply")}
            </button>
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="text-xs font-medium bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              {submitting ? t("saving") : t("submitReply")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
