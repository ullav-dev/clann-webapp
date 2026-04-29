"use client";

import { useState } from "react";
import { useTree } from "@/contexts/TreeContext";
import { useTeam } from "@/contexts/TeamContext";
import { useTranslations } from "next-intl";
import type { FamilyTree } from "@/lib/types";

interface Props {
  teamId: string;
  linkedTrees: FamilyTree[];
  onClose: () => void;
  onLinked?: () => void;
}

export default function LinkTreeModal({ teamId, linkedTrees, onClose, onLinked }: Props) {
  const { trees } = useTree();
  const { setTreeTeam } = useTeam();
  const t = useTranslations("team");
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkedNames = new Set(linkedTrees.map((t) => t.name));
  const available = trees.filter((t) => !linkedNames.has(t.name) && !t.team_id);

  async function handleLink(tree: FamilyTree) {
    setLinking(tree.name);
    setError(null);
    try {
      await setTreeTeam(tree.name, teamId);
      onLinked?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("linkFailed"));
    } finally {
      setLinking(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-800">{t("linkTree")}</h2>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {available.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-4">{t("noTreesToLink")}</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden max-h-64 overflow-y-auto">
            {available.map((tree) => (
              <li key={tree.name} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-stone-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{tree.display_name}</p>
                  <p className="text-xs text-stone-400 font-mono">{tree.name}</p>
                </div>
                <button
                  onClick={() => handleLink(tree)}
                  disabled={linking === tree.name}
                  className="ml-3 shrink-0 text-sm font-medium text-violet-700 hover:text-violet-900 disabled:opacity-50 transition-colors"
                >
                  {linking === tree.name ? t("linking") : t("link")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="w-full border border-stone-300 text-stone-600 text-sm py-2 rounded-lg hover:bg-stone-50 transition-colors"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
