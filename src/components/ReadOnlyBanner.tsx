"use client";

import { useTeam } from "@/contexts/TeamContext";
import { useTree } from "@/contexts/TreeContext";
import { useTranslations } from "next-intl";

export default function ReadOnlyBanner() {
  const { activeTree } = useTree();
  const { isTeamTree, treeTeamName } = useTeam();
  const t = useTranslations("team");

  if (!activeTree || !isTeamTree(activeTree.name)) return null;

  const teamName = treeTeamName(activeTree.name);

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
