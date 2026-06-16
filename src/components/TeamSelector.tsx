"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTeam } from "@/contexts/TeamContext";
import { useTree } from "@/contexts/TreeContext";
import type { TeamSummary } from "@/lib/types";
import TeamAvatar from "./TeamAvatar";

/**
 * Dropdown for switching between team workspaces (and Personal).
 *
 * Switching team context auto-selects the first available tree in that workspace
 * so that the user's working context changes immediately.
 *
 * Workspace tree selection priority when switching TO a team:
 *   1. Own trees with team_id matching the selected team
 *   2. Shared (member) trees with that team_id
 * Switching to Personal selects the user's primary tree (or first own tree).
 */
export default function TeamSelector() {
  const t = useTranslations("teamSelector");
  const { teams, teamTrees, activeTeam, setActiveTeam } = useTeam();
  const { trees, activeTree, setActiveTree } = useTree();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] ?? "en";

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (teams.length === 0) return null;

  function switchToTeam(team: TeamSummary | null) {
    setActiveTeam(team);
    setOpen(false);

    if (team) {
      // Own trees linked to this team
      const ownTeamTrees = trees.filter((t) => t.team_id === team.id);
      // Shared trees from this team
      const sharedTeamTrees = teamTrees.filter((t) => t.team_id === team.id);
      const workspace = [...ownTeamTrees, ...sharedTeamTrees];
      const next = workspace[0] ?? null;
      if (next && next.name !== activeTree?.name) {
        setActiveTree(next);
      }
    } else {
      // Personal: select primary own tree or first own tree
      const primary = trees.find((t) => t.is_primary) ?? trees[0] ?? null;
      if (primary && primary.name !== activeTree?.name) {
        setActiveTree(primary);
      }
    }

    router.push(`/${locale}/family`);
  }

  const label = activeTeam ? activeTeam.name : t("personal");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        title={t("switchTeam")}
      >
        {activeTeam ? (
          <TeamAvatar team={activeTeam} size="xs" />
        ) : (
          <span className="w-5 h-5 flex items-center justify-center text-base leading-none">👤</span>
        )}
        <span className="max-w-[8rem] truncate">{label}</span>
        <svg className="w-3 h-3 shrink-0 text-stone-400" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 7L0 2h10L5 7z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl border border-stone-200 shadow-lg z-50 py-1">
          <p className="px-3 pt-2 pb-1 text-xs font-semibold text-stone-400 uppercase tracking-wide">
            {t("workspace")}
          </p>

          {/* Personal option */}
          <button
            onClick={() => switchToTeam(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-stone-50 transition-colors"
          >
            <span className="w-6 h-6 flex items-center justify-center text-base shrink-0">👤</span>
            <span className={`flex-1 truncate ${!activeTeam ? "font-semibold text-emerald-700" : "text-stone-700"}`}>
              {t("personal")}
            </span>
            {!activeTeam && (
              <svg className="shrink-0 w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Team options */}
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => switchToTeam(team)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-stone-50 transition-colors"
            >
              <TeamAvatar team={team} size="xs" />
              <span className={`flex-1 truncate ${activeTeam?.id === team.id ? "font-semibold text-emerald-700" : "text-stone-700"}`}>
                {team.name}
              </span>
              {activeTeam?.id === team.id && (
                <svg className="shrink-0 w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
