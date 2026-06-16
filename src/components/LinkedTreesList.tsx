"use client";

import { useState } from "react";
import type { FamilyTree, Team } from "@/lib/types";
import { useTeam } from "@/contexts/TeamContext";
import { useTree } from "@/contexts/TreeContext";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import LinkTreeModal from "./LinkTreeModal";
import TreeEditorManager from "./TreeEditorManager";
import { useConfirm } from "@/contexts/ConfirmContext";

interface Props {
  teamId: string;
  trees: FamilyTree[];
  isOwner: boolean;
  team: Team;
  onChanged: () => void;
}

export default function LinkedTreesList({ teamId, trees, isOwner, team, onChanged }: Props) {
  const { setTreeTeam } = useTeam();
  const { setActiveTree } = useTree();
  const t = useTranslations("team");
  const { confirm } = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] ?? "en";
  const [showLink, setShowLink] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [expandedEditors, setExpandedEditors] = useState<string | null>(null);

  async function handleUnlink(treeName: string) {
    if (!(await confirm(t("unlinkConfirm"), { variant: "destructive" }))) return;
    setUnlinking(treeName);
    try {
      await setTreeTeam(treeName, null);
      onChanged();
    } finally {
      setUnlinking(null);
    }
  }

  function handleView(tree: FamilyTree) {
    setActiveTree(tree);
    router.push(`/${locale}/family`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">{t("linkedTrees")} ({trees.length})</h3>
        {isOwner && (
          <button
            onClick={() => setShowLink(true)}
            className="text-sm font-medium text-violet-700 hover:text-violet-900 transition-colors"
          >
            + {t("linkTree")}
          </button>
        )}
      </div>

      {trees.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-6 rounded-xl border border-dashed border-stone-200">
          {t("noLinkedTrees")}
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden">
          {trees.map((t_) => (
            <li key={t_.name} className="bg-white">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-stone-400 text-lg">🌳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{t_.display_name}</p>
                  <p className="text-xs text-stone-400 font-mono">{t_.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleView(t_)}
                    className="text-xs font-medium text-violet-700 hover:text-violet-900 transition-colors"
                  >
                    {t("view")}
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() =>
                          setExpandedEditors(expandedEditors === t_.name ? null : t_.name)
                        }
                        className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
                      >
                        {expandedEditors === t_.name ? t("hideEditors") : t("manageEditors")}
                      </button>
                      <button
                        onClick={() => handleUnlink(t_.name)}
                        disabled={unlinking === t_.name}
                        className="text-xs text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {unlinking === t_.name ? t("unlinking") : t("unlink")}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {isOwner && expandedEditors === t_.name && (
                <div className="px-4 pb-4 border-t border-stone-100">
                  <TreeEditorManager treeName={t_.name} team={team} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showLink && (
        <LinkTreeModal
          teamId={teamId}
          linkedTrees={trees}
          onClose={() => setShowLink(false)}
          onLinked={onChanged}
        />
      )}
    </div>
  );
}
