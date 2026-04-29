"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";
import { removeMember } from "@/lib/teams-api";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import InviteMemberModal from "./InviteMemberModal";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800",
  leader: "bg-blue-100 text-blue-800",
  member: "bg-stone-100 text-stone-600",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  invited: "bg-violet-100 text-violet-700",
  inactive: "bg-stone-100 text-stone-500",
};

interface Props {
  team: Team;
  onChanged: () => void;
}

export default function TeamMemberList({ team, onChanged }: Props) {
  const { token, user } = useAuth();
  const t = useTranslations("team");
  const [showInvite, setShowInvite] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = team.owner.username === user?.username;

  async function handleRemove(userId: string, username: string) {
    if (!confirm(t("removeMemberConfirm", { name: username }))) return;
    setRemoving(userId);
    setError(null);
    try {
      await removeMember(token!, team.id, userId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("removeFailed"));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">{t("members")} ({team.members.length})</h3>
        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="text-sm font-medium text-violet-700 hover:text-violet-900 transition-colors"
          >
            + {t("inviteMember")}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden">
        {team.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 bg-white">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-500 shrink-0 select-none">
              {(m.user.first_name?.[0] ?? m.user.username[0]).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">
                {m.user.first_name && m.user.last_name
                  ? `${m.user.first_name} ${m.user.last_name}`
                  : m.user.username}
              </p>
              <p className="text-xs text-stone-400 truncate">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}>
                {t(`role_${m.role}`)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[m.status] ?? STATUS_BADGE.inactive}`}>
                {t(`status_${m.status}`)}
              </span>
            </div>
            {isOwner && m.role !== "owner" && (
              <button
                onClick={() => handleRemove(m.user.id, m.user.username)}
                disabled={removing === m.user.id}
                title={t("removeMember")}
                className="ml-1 shrink-0 p-1 rounded text-stone-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      {showInvite && (
        <InviteMemberModal
          teamId={team.id}
          onClose={() => setShowInvite(false)}
          onInvited={onChanged}
        />
      )}
    </div>
  );
}
