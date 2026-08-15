"use client";

// THROWAWAY Phase 0 integration spike for the tack-server notes migration
// (/Users/colin/.claude/plans/linked-roaming-rabbit.md, "Frontend
// integration" -- "confirmed with a small throwaway integration spike in
// Phase 0, not asserted from the doc alone"). Not linked from any nav; not
// i18n'd (translator below is a hardcoded stub, not next-intl -- the real
// audit is Task #14); not meant to survive past Phase 0 sign-off. Delete
// this route once `TackNotesPanel`'s extension points are confirmed
// sufficient and Task #13 is checked off.
//
// Purpose: typecheck + render `TackNotesPanel` against
// `createClannTackNotesApi` (src/lib/tack-notes-adapter.ts) with the actual
// extension points Clann needs -- `description` via `renderComposerExtra`/
// `onBeforeSave`'s `extra` passthrough, `folderScope="team"` (Clann's
// folders are personal, not per-tree, same as Cartlann's), and
// `shared-by-me`/`shared-by-others` `filterChips` reproducing
// `ResearchPage.tsx`'s old virtual smart-folders. Proves no new package
// capability is needed, per the plan.

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import { createClannTackNotesApi } from "@/lib/tack-notes-adapter";
import { NoteEventsProvider, TackNotesPanel, type FilterChip, type Note } from "@ullav-dev/tack-notes";

// Minimal stub translator covering the key superset TackNotesPanel/
// TackNoteThread actually call (see @ullav-dev/tack-notes's own README) --
// not the real per-locale catalogue, see this file's own doc comment.
const STUB_STRINGS: Record<string, string> = {
  addNote: "Add note", backToList: "Back", cancel: "Cancel", close: "Close",
  createVersion: "Create version", delete: "Delete", deleteCancel: "Cancel",
  deleteConfirm: "Delete", deleteFolder: "Delete folder", deleteNote: "Delete note",
  deleteNoteConfirmBody: "This can't be undone.", deleteNoteConfirmTitle: "Delete this note?",
  deleteVersionConfirm: "Delete version", edit: "Edit", editedBy: "Edited by {name}",
  editedSinceSave: "Edited since you started", exportHtml: "Export HTML",
  exportMarkdown: "Export Markdown", exportOldVersionConfirm: "Export anyway",
  exportOldVersionConfirmBody: "You're viewing an old version.", exportOldVersionConfirmTitle: "Export old version?",
  exportPdf: "Export PDF", folderFilterAll: "All", folderFilterMine: "Mine",
  folderFilterShared: "Shared", folderUnfiled: "Unfiled", history: "History",
  loading: "Loading…", newFolder: "New folder", newFolderName: "Folder name",
  newNote: "New note", noNotes: "No notes yet", nothingToPreview: "Nothing to preview",
  olderReplies: "Older replies", preview: "Preview", renameFolder: "Rename folder",
  reply: "Reply", replyPlaceholder: "Write a reply…", save: "Save", saving: "Saving…",
  selectNote: "Select a note", showLatest: "Show latest", titlePlaceholder: "Title",
  unread: "Unread", untitled: "Untitled", untitledNote: "Untitled note",
  version: "Version", versionCreated: "Version created", versionHistory: "Version history",
  viewThisVersion: "View this version", viewingOldVersion: "Viewing an old version",
  write: "Write", "visibility.organization": "Organization", "visibility.private": "Private",
  "visibility.team": "Team",
};
const stubT = (key: string) => STUB_STRINGS[key] ?? key;

export default function DevTackSpikePage() {
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
          t={stubT}
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
