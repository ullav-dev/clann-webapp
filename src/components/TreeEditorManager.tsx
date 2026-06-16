"use client";

import { useCallback, useEffect, useState } from "react";
import type { Team, TreeEditor } from "@/lib/types";
import { addTreeEditor, listTreeEditors, removeTreeEditor } from "@/lib/api";
import { useTranslations } from "next-intl";

interface Props {
  treeName: string;
  team: Team;
}

export default function TreeEditorManager({ treeName, team }: Props) {
  const t = useTranslations("team");
  const [editors, setEditors] = useState<TreeEditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Active (accepted) members excluding the owner
  const members = team.members.filter(
    (m) => m.status === "active" && m.user.username !== team.owner.username
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEditors(await listTreeEditors(treeName));
    } catch {
      setError(t("editorsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [treeName, t]);

  useEffect(() => { load(); }, [load]);

  async function toggleEditor(userId: string, isCurrentlyEditor: boolean) {
    setToggling(userId);
    setError(null);
    try {
      if (isCurrentlyEditor) {
        await removeTreeEditor(treeName, userId);
      } else {
        await addTreeEditor(treeName, userId);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("editorsToggleError"));
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return <p className="text-xs text-stone-400 py-2">{t("loading")}</p>;
  }

  const editorIds = new Set(editors.map((e) => e.user_id));

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
        {t("treeEditors")}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {members.length === 0 ? (
        <p className="text-xs text-stone-400">{t("noMembersToGrant")}</p>
      ) : (
        <ul className="space-y-1">
          {members.map((m) => {
            const isEditor = editorIds.has(m.user.id);
            const busy = toggling === m.user.id;
            const displayName = m.user.first_name
              ? `${m.user.first_name} ${m.user.last_name ?? ""}`.trim()
              : m.user.username;
            return (
              <li key={m.user.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-700">{displayName}</span>
                <button
                  onClick={() => toggleEditor(m.user.id, isEditor)}
                  disabled={busy}
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors disabled:opacity-50 ${
                    isEditor
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {busy ? "…" : isEditor ? t("editorGranted") : t("grantEditor")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
