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
//
// `currentUserId={user.username}` (not `user.id`) -- see
// tack-notes-adapter.ts's own "IDENTITY" doc comment: `research_note.
// created_by` holds a username today, not a UUID, and TackNoteThread's
// ownership check compares `note.created_by === currentUserId` directly, so
// both this prop and the adapter's own `currentUsername` param must agree
// with what `toNote` actually put in `created_by`.
//
// *** PHASE 3 CUTOVER TRAP (verified directly against TackNoteThread.tsx:172,
// 253 -- `currentUserId === note.created_by`/`reply.created_by`, plain string
// equality): once clann-server's handlers are repointed at tack-server, notes
// come back with a real UUM UUID in `created_by` (the backfill resolved every
// author to one), not a username. Both are `string`, so tsc/eslint/build/the
// test suite all pass either way -- the failure is silent: every user stops
// being recognized as the author of their own note, and every edit/delete
// affordance disappears for everyone. `currentUserId` here and the adapter's
// `currentUsername` param MUST flip to `user.id` in the exact same PR that
// repoints the data source -- not before (breaks the still-live SurrealDB
// path), not after (breaks ownership silently). `resolveAuthor={(userId) =>
// userId}` below has the same trap in reverse: it echoes a username today,
// but would echo a raw UUID into the UI post-cutover -- needs a real
// roster/UUM lookup added at that same moment, not left as an identity
// passthrough. ***
//
// `listMode="team"` (not the default "entity") -- required for
// `filterChips` to route through `api.listNotes`'s `filterKey`, which is
// what the adapter's shared-by-me/shared-by-others logic actually
// implements. The default "entity" mode filters client-side via each
// chip's own `predicate` instead (unset below), which would make every
// chip here a silent no-op.

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
    return createClannTackNotesApi(token, activeTree.team_id ?? null, user.username, activeTree.name);
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
          currentUserId={user.username}
          // NEVER Clann's tack-admin concept -- see the plan's explicit
          // warning that this must never be tack's own `is_admin` (a hard
          // ACL bypass on tack-server's side). Hardcoded false in this
          // spike; the real integration wires Clann's own product-admin
          // check here, still never tack's.
          isAdmin={false}
          resolveAuthor={(userId) => userId}
          t={t}
          folderScope="team"
          listMode="team"
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
