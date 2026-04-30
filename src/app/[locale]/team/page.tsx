"use client";

import { useEffect, useState, useCallback } from "react";
import { useTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateTeam } from "@/lib/auth-api";
import { listTeamTrees } from "@/lib/api";
import type { Team, FamilyTree } from "@/lib/types";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import TeamAvatar from "@/components/TeamAvatar";
import TeamMemberList from "@/components/TeamMemberList";
import LinkedTreesList from "@/components/LinkedTreesList";
import CreateTeamModal from "@/components/CreateTeamModal";

const MarkdownEditor = dynamic(() => import("@/components/MarkdownEditor"), { ssr: false });
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Tab = "purpose" | "members" | "trees";

export default function TeamPage() {
  const { token, user } = useAuth();
  const { teams, getTeamDetail, updateTeam, deleteTeam, reload } = useTeam();
  const t = useTranslations("team");

  const [team, setTeam] = useState<Team | null>(null);
  const [linkedTrees, setLinkedTrees] = useState<FamilyTree[]>([]);
  const [tab, setTab] = useState<Tab>("members");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPurpose, setEditPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const userEligible = canCreateTeam(token);
  const ownedTeam = teams.find((t) => t.owner.username === user?.username);
  const memberTeams = teams.filter((t) => t.owner.username !== user?.username);

  const loadTeam = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const detail = await getTeamDetail(id);
      setTeam(detail);
      const trees = await listTeamTrees(id);
      setLinkedTrees(trees);
    } finally {
      setLoading(false);
    }
  }, [getTeamDetail]);

  // Load first available team on mount or when teams list changes
  useEffect(() => {
    const first = ownedTeam ?? memberTeams[0];
    if (first) {
      loadTeam(first.id);
    } else {
      setLoading(false);
    }
  }, [teams]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit() {
    if (!team) return;
    setEditName(team.name);
    setEditDesc(team.description ?? "");
    setEditPurpose(team.purpose ?? "");
    setEditing(true);
    setSaveError(null);
  }

  async function handleSave() {
    if (!team) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateTeam(team.id, {
        name: editName.trim() || undefined,
        description: editDesc.trim() || undefined,
        purpose: editPurpose.trim() || undefined,
      });
      setTeam(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!team || !confirm(t("deleteTeamConfirm", { name: team.name }))) return;
    await deleteTeam(team.id);
    setTeam(null);
  }

  const isOwner = team?.owner.username === user?.username;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-400 text-sm">
        {t("loading")}
      </div>
    );
  }

  // No team at all
  if (!team) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-5">
        <div className="text-5xl">👥</div>
        <h1 className="text-xl font-semibold text-stone-800">{t("noTeamTitle")}</h1>
        {userEligible ? (
          <>
            <p className="text-stone-500 text-sm">{t("noTeamEligible")}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-violet-700 hover:bg-violet-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              + {t("createTeam")}
            </button>
          </>
        ) : (
          <p className="text-stone-500 text-sm">{t("noTeamIneligible")}</p>
        )}

        {showCreate && (
          <CreateTeamModal
            onClose={() => setShowCreate(false)}
            onCreated={() => reload()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <TeamAvatar team={team} size="lg" />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-lg font-semibold border border-stone-300 rounded-lg px-3 py-1.5 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 mb-1"
            />
          ) : (
            <h1 className="text-xl font-semibold text-stone-800">{team.name}</h1>
          )}
          {editing ? (
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-1.5 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          ) : (
            team.description && (
              <p className="text-stone-500 text-sm mt-0.5">{team.description}</p>
            )
          )}
          <p className="text-xs text-stone-400 mt-1">
            {t("ownedBy", { name: team.owner.first_name ? `${team.owner.first_name} ${team.owner.last_name}` : team.owner.username })}
          </p>
        </div>
        {isOwner && !editing && (
          <button
            onClick={startEdit}
            className="shrink-0 text-sm font-medium text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
          >
            {t("edit")}
          </button>
        )}
        {editing && (
          <div className="shrink-0 flex gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="text-sm text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-medium bg-violet-700 hover:bg-violet-800 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        )}
      </div>
      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-stone-200">
        {(["members", "trees", "purpose"] as Tab[]).map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === name
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t(`tab_${name}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "members" && (
        <TeamMemberList team={team} onChanged={() => loadTeam(team.id)} />
      )}

      {tab === "trees" && (
        <LinkedTreesList
          teamId={team.id}
          trees={linkedTrees}
          isOwner={isOwner}
          onChanged={() => loadTeam(team.id)}
        />
      )}

      {tab === "purpose" && (
        <div className="space-y-3">
          {editing ? (
            <MarkdownEditor value={editPurpose} onChange={(v) => setEditPurpose(v ?? "")} />
          ) : team.purpose ? (
            <div className="prose prose-stone max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{team.purpose}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-stone-400 text-sm text-center py-8">
              {isOwner ? t("noPurposeOwner") : t("noPurpose")}
            </p>
          )}
        </div>
      )}

      {/* Danger zone — owner only */}
      {isOwner && !editing && (
        <div className="border border-red-200 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-red-700">{t("dangerZone")}</h3>
          <p className="text-xs text-stone-500">{t("deleteTeamWarning")}</p>
          <button
            onClick={handleDelete}
            className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            {t("deleteTeam")}
          </button>
        </div>
      )}

      {/* New team button for eligible users who already own a team — hidden for now (1-team limit) */}
    </div>
  );
}
