"use client";

import { useTeam } from "@/contexts/TeamContext";
import { useTree } from "@/contexts/TreeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";

export default function ReadOnlyBanner() {
  const { activeTree } = useTree();
  const { isTeamTree, treeTeamName, isEditorOf } = useTeam();
  const { user } = useAuth();
  const t = useTranslations("team");

  // Never show the banner for trees the current user owns.
  if (!activeTree || activeTree.owner === user?.username || !isTeamTree(activeTree.name)) return null;

  const teamName = treeTeamName(activeTree.name);
  const isEditor = isEditorOf(activeTree.name);

  if (isEditor) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
        <span>✏️</span>
        <span>
          {teamName
            ? t("editorBannerWithTeam", { team: teamName })
            : t("editorBanner")}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-violet-800">
      <span>👥</span>
      <span>
        {teamName
          ? t("readOnlyBannerWithTeam", { team: teamName })
          : t("readOnlyBanner")}
      </span>
    </div>
  );
}
