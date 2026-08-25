"use client";

// The real (production) Notes UI, replacing `ResearchPage.tsx`'s old
// bespoke list/editor/thread with `@ullav-dev/tack-notes`'s
// `TackNotesPanel`, backed by `createClannTackNotesApi`
// (`tack-notes-adapter.ts`) — Phase 3's frontend cutover
// (/Users/colin/.claude/plans/linked-roaming-rabbit.md).
//
// Preserves, on top of what `TackNotesPanel` already gives for free
// (list/create/edit/delete/reply/version history/export, folder chrome,
// unread badges):
// - `description` (no column in tack's own `Note` schema) via
//   `renderComposerExtra`/`onBeforeSave`'s `extra` passthrough. Read at
//   save time straight off the mounted textarea via a ref, not React
//   state, so both a fresh create, a "save as note" pre-fill, and editing
//   an existing note's description all save the field's actual live
//   value even if the user never touches it (a shared-state approach here
//   would go stale across those three cases — see git history for the
//   version that had this bug before landing).
// - The DAM picker (`@ullav-dev/dam-picker`) for inserting an asset link
//   into a note's body, via `TackNotesPanel`'s `ImagePicker` extension
//   point (`DamImagePicker` below) — same insertion behaviour
//   (`![name](url + "/thumbnail")`) `ResearchPage.tsx`'s own composer had.
// - "🤖 Dig deeper" (send a note's title/body into the AI Advisor) via
//   `renderDetailHeaderActions`.
// - "Save as Note" pre-fill from the AI Advisor / Wikipedia / Irish
//   Genealogy panels via `initialDraft`/`onInitialDraftConsumed`.
//
// Author display: tack notes carry a real UUM user UUID in `created_by`
// now (see `tack-notes-adapter.ts`'s own "IDENTITY" doc comment), so
// `resolveAuthor` below resolves it to a display name — a self fast-path
// (covers every personal/team-less note, since a private team-less note
// is only ever visible to its own creator) plus a lookup against the
// active tree's own team roster (covers every team note). An author
// outside both — a team note from someone who's since left the team — is
// the one case this doesn't resolve; falls back to a short id fragment
// rather than crashing.
//
// `isAdmin` passed to `TackNotesPanel` is Clann's own product-admin role
// (`roles.includes("admin")`), NEVER tack's own `is_admin` — tack's
// `is_admin` is a hard, unconditional ACL bypass on both `can_view`/
// `can_edit` server-side; conflating the two would be a real privacy leak,
// not a cosmetic mix-up (see the migration plan's own "Architecture
// decision" section).

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/lib/auth-api";
import { getTeam } from "@/lib/teams-api";
import type { FamilyTree, TeamUserRef } from "@/lib/types";
import { createClannTackNotesApi, type ClannNote } from "@/lib/tack-notes-adapter";
import { NoteEventsProvider, TackNotesPanel, type Note } from "@ullav-dev/tack-notes";
import { DamPicker, type PickedAsset } from "@ullav-dev/dam-picker";

function displayName(u: { username: string; first_name: string | null; last_name: string | null }): string {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return full || u.username;
}

function DamImagePicker({ onSelect, onClose }: { onSelect: (asset: { url: string; name: string }) => void; onClose: () => void }) {
  const { token, user } = useAuth();
  return (
    <div className="p-2 bg-white">
      <div className="flex justify-end mb-1">
        <button type="button" onClick={onClose} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
          ✕
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-200">
        <DamPicker
          apiBase="/api/dam"
          token={token ?? ""}
          username={user?.username ?? ""}
          filter={(a) => a.asset_type.startsWith("image/")}
          onSelect={(asset: PickedAsset) => {
            onSelect({ url: asset.url.replace(/\/?$/, "/thumbnail"), name: asset.name });
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export interface NoteDraft {
  title: string;
  description: string;
  body: string;
}

interface Props {
  activeTree: FamilyTree;
  isAdmin: boolean;
  initialDraft: NoteDraft | null;
  onInitialDraftConsumed: () => void;
  onDigDeeper: (title: string, body: string) => void;
}

export default function ResearchNotesPanel({ activeTree, isAdmin, initialDraft, onInitialDraftConsumed, onDigDeeper }: Props) {
  const t = useTranslations("notes");
  const { user, token } = useAuth();

  const isTeamLinkedTree = !!activeTree.team_id;

  const api = useMemo(() => {
    if (!token || !user) return null;
    return createClannTackNotesApi(token, user.username, activeTree.name);
  }, [token, user, activeTree.name]);

  // Team roster for resolveAuthor — see this file's own doc comment. The
  // "no team" branch resolves to an empty roster too, but asynchronously
  // (via the same `.then()` as the real fetch), not a synchronous setState
  // in the effect body — avoids the cascading-render lint the direct form
  // trips.
  const [roster, setRoster] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const fetchRoster = token && activeTree.team_id ? getTeam(token, activeTree.team_id) : Promise.resolve(null);
    fetchRoster
      .then((team) => {
        if (cancelled) return;
        if (!team) { setRoster({}); return; }
        const map: Record<string, string> = {};
        const add = (u: TeamUserRef) => { map[u.id] = displayName(u); };
        add(team.owner);
        add(team.leader);
        team.members.forEach((m) => add(m.user));
        setRoster(map);
      })
      .catch(() => { if (!cancelled) setRoster({}); });
    return () => { cancelled = true; };
  }, [token, activeTree.team_id]);

  function resolveAuthor(userId: string): string {
    if (user && userId === user.id) return displayName(user as AuthUser);
    return roster[userId] ?? userId.slice(0, 8);
  }

  // Description field — read from the DOM at save time via this ref, not
  // React state, so it's always the field's live value regardless of
  // create/edit/pre-filled (see this file's own doc comment).
  const descRef = useRef<HTMLTextAreaElement>(null);
  // Seeded from `initialDraft` by comparing against the last-seen draft
  // during render (React's own recommended "adjust state during render"
  // pattern for resetting derived state from a changed prop), not an
  // effect — this is a synchronous derivation, not a subscription to an
  // external system, so an effect isn't the right tool here.
  const [createDescriptionSeed, setCreateDescriptionSeed] = useState("");
  const [seededDraft, setSeededDraft] = useState(initialDraft);
  if (initialDraft !== seededDraft) {
    setSeededDraft(initialDraft);
    setCreateDescriptionSeed(initialDraft?.description ?? "");
  }

  if (!api) return null;

  return (
    <NoteEventsProvider>
      <TackNotesPanel
        api={api}
        owningService="clann"
        entityType="tree"
        entityId={activeTree.name}
        teamId={activeTree.team_id ?? ""}
        currentUserId={user!.id}
        isAdmin={isAdmin}
        resolveAuthor={resolveAuthor}
        t={t}
        twoColumn
        defaultVisibility={isTeamLinkedTree ? "team" : "private"}
        ImagePicker={DamImagePicker}
        initialDraft={initialDraft ? { title: initialDraft.title, body_markdown: initialDraft.body } : null}
        onInitialDraftConsumed={onInitialDraftConsumed}
        renderDetailHeaderActions={(note) => (
          <button
            type="button"
            onClick={() => onDigDeeper(note.title, note.body_markdown)}
            className="text-sm text-violet-700 hover:text-violet-800 font-medium transition-colors"
          >
            🤖 {t("digDeeper")}
          </button>
        )}
        renderComposerExtra={(mode, note) => {
          const existingDescription = (note as ClannNote | undefined)?.description ?? "";
          return (
            <div className="mt-2" key={mode === "edit" ? `edit-${note?.id}` : "create"}>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("descriptionLabel")}</label>
              <textarea
                ref={descRef}
                defaultValue={mode === "edit" ? existingDescription : createDescriptionSeed}
                rows={2}
                className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          );
        }}
        onBeforeSave={(mode) => {
          const description = descRef.current?.value ?? "";
          if (mode === "create") setCreateDescriptionSeed("");
          return { description: description || null };
        }}
      />
    </NoteEventsProvider>
  );
}

export type { Note };
