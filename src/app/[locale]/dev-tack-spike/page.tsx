"use client";

// THROWAWAY Phase 0 integration spike for the tack-server notes migration
// (/Users/colin/.claude/plans/linked-roaming-rabbit.md, "Frontend
// integration" -- "confirmed with a small throwaway integration spike in
// Phase 0, not asserted from the doc alone"). Not linked from any nav; not
// meant to survive past Phase 0 sign-off. Delete this route once
// `TackNotesPanel`'s extension points are confirmed sufficient and Tasks
// #13/#14 are checked off.
//
// Purpose: typecheck + render `TackNotesPanel` against
// `createClannTackNotesApi` (src/lib/tack-notes-adapter.ts) with the actual
// extension points Clann needs -- `description` via `renderComposerExtra`/
// `onBeforeSave`'s `extra` passthrough, `folderScope="team"` (Clann's
// folders are personal, not per-tree, same as Cartlann's), and
// `shared-by-me`/`shared-by-others` `filterChips` reproducing
// `ResearchPage.tsx`'s old virtual smart-folders. Proves no new package
// capability is needed, per the plan.
//
// `t` below is the real `next-intl` `notes` namespace (messages/{en,de,ga}.
// json), not a stub -- this doubles as the live check for Task #14's i18n
// audit: every key `TackNotesPanel`/`TackNoteThread` call is now a real,
// translated string in all three locales, seeded from togra's own
// `NotesPanel` catalogue (the closest existing production consumer of this
// exact component), not re-derived from scratch.

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import { createClannTackNotesApi } from "@/lib/tack-notes-adapter";
import { NoteEventsProvider, TackNotesPanel, type FilterChip, type Note } from "@ullav-dev/tack-notes";

export default function DevTackSpikePage() {
  const t = useTranslations("notes");
  const { user, token } = useAuth();
  const { activeTree } = useTree();
  const [description, setDescription] = useState("");

  const api = useMemo(() => {
    if (!token || !user || !activeTree) return null;
    return createClannTackNotesApi(token, activeTree.team_id ?? null, user.id, activeTree.name);
  }, [token, user, activeTree]);

  const filterChips: FilterChip[] = [
    { key: "all", label: "All" },
    { key: "shared-by-me", label: "Shared by me" },
    { key: "shared-by-others", label: "Shared by others" },
  ];

  if (!user || !activeTree || !api) {
    return <div className="p-8 text-stone-500">Sign in and select a tree first.</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold mb-4 text-stone-800">
        tack-notes Phase 0 spike -- tree &quot;{activeTree.name}&quot;
      </h1>
      <NoteEventsProvider>
        <TackNotesPanel
          api={api}
          owningService="clann"
          entityType="tree"
          entityId={activeTree.name}
          teamId={activeTree.team_id ?? ""}
          currentUserId={user.id}
          // NEVER Clann's tack-admin concept -- see the plan's explicit
          // warning that this must never be tack's own `is_admin` (a hard
          // ACL bypass on tack-server's side). Hardcoded false in this
          // spike; the real integration wires Clann's own product-admin
          // check here, still never tack's.
          isAdmin={false}
          resolveAuthor={(userId) => userId}
          t={t}
          folderScope="team"
          filterChips={filterChips}
          renderComposerExtra={(_mode, note: Note | undefined) => (
            <div className="mt-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
              <textarea
                className="w-full border border-stone-300 rounded-md px-2 py-1 text-sm"
                defaultValue={(note as { description?: string | null } | undefined)?.description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          )}
          onBeforeSave={() => ({ description: description || null })}
        />
      </NoteEventsProvider>
    </div>
  );
}
