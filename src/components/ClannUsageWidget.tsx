"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { listPersons, listResearchNotes, listTrees } from "@/lib/api";

function barColour(pct: number): string {
  if (pct >= 0.9) return "bg-red-500";
  if (pct >= 0.75) return "bg-amber-500";
  return "bg-emerald-500";
}

interface RowProps {
  label: string;
  used: number | undefined;
  limit: number;
  unlimitedLabel: string;
  thin?: boolean;
}

function UsageRow({ label, used, limit, unlimitedLabel, thin }: RowProps) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : used !== undefined ? Math.min(1, used / limit) : 0;
  const displayUsed = used !== undefined ? used.toLocaleString() : "…";
  const displayLimit = unlimited ? unlimitedLabel : limit.toLocaleString();

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-xs font-medium text-stone-600 shrink-0">{label}</span>
        <span className="text-xs text-stone-500 tabular-nums">
          {displayUsed} / {displayLimit}
        </span>
      </div>
      <div className={`w-full bg-stone-200 rounded-full overflow-hidden ${thin ? "h-1" : "h-1.5"}`}>
        {unlimited ? (
          <div className="h-full w-full bg-emerald-400 rounded-full" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColour(pct)}`}
            style={{ width: used !== undefined ? `${Math.max(1, Math.round(pct * 100))}%` : "0%" }}
          />
        )}
      </div>
    </div>
  );
}

interface Props {
  /**
   * Frameless two-row variant for embedding beside the "Add Person" button.
   * Uses short labels and a max-width constraint.
   */
  inline?: boolean;
}

export default function ClannUsageWidget({ inline = false }: Props) {
  const { user } = useAuth();
  const { maxMembers, maxNotes } = useSubscription();
  const t = useTranslations("usageWidget");

  const [personCount, setPersonCount] = useState<number | undefined>(undefined);
  const [noteCount, setNoteCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    // Fetch totals across ALL trees — no tree filter — for the global plan limit.
    listPersons(user.username)
      .then((people) => setPersonCount(people.length))
      .catch(() => {});
    // clann-server's own `/api/notes` is always tree-scoped now (backed by
    // tack-server, see the notes migration plan) — there's no cross-tree
    // "all my notes" endpoint anymore, unlike the old SurrealDB-backed
    // handler this widget originally called. Reconstructed here by summing
    // per-tree counts across every tree the user owns (mirrors
    // `TreeContext`'s own `listTrees(user.username)` — the same set the
    // tree switcher offers). `GET /api/notes` only ever returns top-level,
    // entity-attached notes (a reply is never itself attached to a tree —
    // see `handlers::research_note::create_note_reply`), so there's no
    // reply-vs-top-level distinction left to make here, unlike the old
    // `is_shared`-era version of this effect. A team-linked tree the user
    // has access to but doesn't own is not counted here, same gap as the
    // person count above, which was already scoped to owned trees before
    // this change.
    listTrees(user.username)
      .then((trees) => Promise.all(trees.map((tr) => listResearchNotes(tr.name).catch(() => []))))
      .then((perTree) => {
        const ownNoteIds = new Set(
          perTree.flatMap((notes) => notes.filter((n) => n.created_by === user.id).map((n) => n.id))
        );
        setNoteCount(ownNoteIds.size);
      })
      .catch(() => {});
  }, [user]);

  const unlimited = t("unlimited");

  if (inline) {
    return (
      <div className="w-full space-y-1.5">
        <UsageRow
          label={t("membersShort")}
          used={personCount}
          limit={maxMembers}
          unlimitedLabel={unlimited}
          thin
        />
        <UsageRow
          label={t("notesShort")}
          used={noteCount}
          limit={maxNotes}
          unlimitedLabel={unlimited}
          thin
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
      <div className="px-6 py-5">
        <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-4">
          {t("title")}
        </p>
        <div className="space-y-5">
          <UsageRow
            label={t("familyMembers")}
            used={personCount}
            limit={maxMembers}
            unlimitedLabel={unlimited}
          />
          <UsageRow
            label={t("researchNotes")}
            used={noteCount}
            limit={maxNotes}
            unlimitedLabel={unlimited}
          />
        </div>
      </div>
    </div>
  );
}
