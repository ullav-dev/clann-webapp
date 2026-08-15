// Adapts clann-server's own `/api/notes`/`/api/folders` REST API to the
// `TackNotesApi` interface `@ullav-dev/tack-notes`'s components expect, so
// `TackNotesPanel`/`TackNoteThread` can be used here exactly as in every
// other app in the tack-server notes migration
// (/Users/colin/.claude/plans/linked-roaming-rabbit.md).
//
// PHASE 0 STATUS: this is the Phase 0 "throwaway integration spike" the
// plan calls for -- it exists to prove `TackNotesPanel`'s extension points
// (`extra`, `filterChips`, `folderScope`, `renderComposerExtra`) are
// sufficient for Clann's needs, typechecked against the real package, not
// to be the final production wiring. It currently calls clann-server's
// *existing* SurrealDB-backed `/api/notes`/`/api/folders` handlers
// (research_note.rs), which are untouched so far -- Phase 2/3 of the plan
// repoints clann-server's own handlers at tack-server via `tack_client.rs`
// (already added, see clann-server PR #56) without needing any change to
// this file's wire contract towards the frontend. `entityId`/`treeId`
// below is therefore a tree's `name` slug (what `research_note.trees[]`
// and `GET /api/notes?tree=` actually key on today), not yet the resolved
// `family_tree` UUID the plan's data-model mapping calls for post-backfill
// -- that switch happens once Phase 3's frontend cutover lands for real.
//
// This is a *hybrid* adapter, not a plain `createTackNotesApi` pointed at
// clann-server's base URL, for the same two reasons the plan's
// "Architecture decision" section gives:
// - `description` has no column in tack's `Note` schema -- carried here via
//   the `extra` passthrough, exactly like Cartlann's own adapter does for
//   its own `description`/`object_ids` extras.
// - Clann's real visibility model is per-tree grants (owner/editor/viewer),
//   not team membership -- `is_shared` maps to `visibility="team"` as a
//   first approximation only; the per-tree ACL post-filter clann-server's
//   own backend applies is the actual source of truth, not tack's ACL.
//
// Pure-tack features with no Clann-specific meaning at all (revisions,
// unread tracking, system principals) delegate straight to a real
// `createTackNotesApi` bound to the same-origin `/api/tack/*` proxy (see
// proxy.ts) -- these won't do anything useful until Phase 2/3 land, since
// today's notes don't exist in tack-server at all, but they typecheck and
// wire correctly now.
//
// Per-user folder scoping: `research_folder` is `created_by`+`name` UNIQUE
// with no tree/entity reference of its own (verified directly against
// clann-server's schema.surql) -- a personal organizing tool, same as
// Cartlann's model, not a tree-shared one. `listNoteFolders`/`listNotes`
// below reproduce that scoping client-side, same reasoning as
// `ullav-collection-browser/src/lib/tack-notes-adapter.ts`'s own doc
// comment on this exact point.

import {
  createFolder as apiCreateFolder,
  createNoteReply as apiCreateNoteReply,
  createResearchNote as apiCreateResearchNote,
  deleteFolder as apiDeleteFolder,
  deleteResearchNote as apiDeleteResearchNote,
  getResearchNote as apiGetResearchNote,
  listFolders as apiListFolders,
  listNoteReplies as apiListNoteReplies,
  listResearchNotes as apiListResearchNotes,
  renameFolder as apiRenameFolder,
  setNoteFolder as apiSetNoteFolder,
  updateResearchNote as apiUpdateResearchNote,
} from "@/lib/api";
import type { ResearchFolder, ResearchNote } from "@/lib/types";
import {
  createTackNotesApi,
  type Note,
  type NoteFolder,
  type NoteFoldersPage,
  type NotesPage,
  type TackNotesApi,
  type Visibility,
} from "@ullav-dev/tack-notes";

/** `Note`, widened with the Clann-specific fields `@ullav-dev/tack-notes`
 * itself has no concept of -- same pattern as Cartlann's own `CartlannNote`.
 * Every note this adapter returns is actually one of these. */
export interface ClannNote extends Note {
  description: string | null;
  trees: string[];
}

/** Mirrors `ResearchPage.tsx`'s old virtual smart-folders exactly. */
export type ClannFilterKey = "shared-by-me" | "shared-by-others";

function toNote(rn: ResearchNote, teamId: string | null): ClannNote {
  return {
    id: rn.id,
    organization_id: "", // unused by any tack-notes component; clann-server's own API doesn't expose it
    team_id: teamId,
    parent_id: rn.parent_id ?? null,
    folder_id: rn.folder_id ?? null,
    visibility: (rn.is_shared ? "team" : "private") as Visibility,
    title: rn.title,
    body_markdown: rn.body ?? "",
    created_by: rn.created_by ?? "",
    created_at: rn.created_at ?? "",
    updated_at: rn.updated_at ?? rn.created_at ?? "",
    reply_count: rn.reply_count ?? 0,
    in_reply_to_version: null,
    description: rn.description ?? null,
    trees: rn.trees,
  };
}

function toNoteFolder(rf: ResearchFolder, teamId: string | null, noteCount: number): NoteFolder {
  return {
    id: rf.id,
    organization_id: "",
    team_id: teamId ?? "",
    name: rf.name,
    owning_service: null,
    entity_type: null,
    entity_id: null,
    created_at: rf.created_at ?? "",
    updated_at: rf.created_at ?? "",
    note_count: noteCount,
  };
}

function paginate<T>(items: T[], limit?: number, offset?: number): { items: T[]; total: number; has_more: boolean } {
  const total = items.length;
  const o = offset ?? 0;
  const l = limit ?? 25;
  const page = items.slice(o, o + l);
  return { items: page, total, has_more: o + page.length < total };
}

/** `token`/`teamId`/`currentUserId`/`treeId` are captured at creation time,
 *  matching `createTackNotesApi`'s own shape -- callers rebuild this per
 *  token/team/user/tree change (e.g. in a `useMemo`), same as every other
 *  app's NotesPanel wrapper does for its own API client.
 *
 *  `teamId` is the resolved `family_tree.team_id` (nullable -- a tree
 *  needn't belong to a team) purely for the `team_id` field on returned
 *  `Note`/`NoteFolder` objects; it plays no role in scoping requests today
 *  since clann-server's existing endpoints scope by tree, not by team (see
 *  this file's own doc comment on `treeId`/`entityId`). */
export function createClannTackNotesApi(
  token: string,
  teamId: string | null,
  currentUserId: string,
  treeId: string
): TackNotesApi {
  // Pure-tack features clann-server has no reason to wrap -- see this
  // file's own doc comment. `token` is unused here today (createTackNotesApi
  // takes it directly) but kept as a parameter for signature parity with
  // every other app's hybrid adapter.
  const direct = createTackNotesApi("/api/tack", token);

  return {
    async listNotes(_teamId, opts) {
      const all = await apiListResearchNotes(treeId);
      let filtered: ResearchNote[];
      if (opts?.filterKey === ("shared-by-me" satisfies ClannFilterKey)) {
        filtered = all.filter((n) => n.is_shared && n.created_by === currentUserId);
      } else if (opts?.filterKey === ("shared-by-others" satisfies ClannFilterKey)) {
        filtered = all.filter((n) => n.is_shared && n.created_by !== currentUserId);
      } else if (opts?.unfiled) {
        filtered = all.filter((n) => !n.folder_id && n.created_by === currentUserId);
      } else if (opts?.folderId) {
        filtered = all.filter((n) => n.folder_id === opts.folderId && n.created_by === currentUserId);
      } else {
        filtered = all;
      }
      const { items, total, has_more } = paginate(filtered, opts?.limit, opts?.offset);
      const page: NotesPage = { notes: items.map((n) => toNote(n, teamId)), total, has_more };
      return page;
    },

    async getNote(id) {
      return toNote(await apiGetResearchNote(id), teamId);
    },

    async createNote(payload) {
      const extra = payload.extra as { description?: string | null } | undefined;
      const created = await apiCreateResearchNote({
        title: payload.title,
        description: extra?.description ?? null,
        body: payload.body_markdown,
        trees: [treeId],
        folder_id: payload.folder_id ?? null,
        created_by: currentUserId,
        is_shared: payload.visibility !== "private",
      });
      return toNote(created, teamId);
    },

    async listNotesByAttachment(owningService, entityType, entityId) {
      if (owningService !== "clann" || entityType !== "tree") return [];
      const notes = await apiListResearchNotes(entityId);
      return notes.filter((n) => !n.parent_id).map((n) => toNote(n, teamId));
    },

    async updateNote(id, payload) {
      const extra = payload.extra as { description?: string | null } | undefined;
      let updated = await apiUpdateResearchNote(id, {
        title: payload.title,
        body: payload.body_markdown,
        is_shared: payload.visibility !== undefined ? payload.visibility !== "private" : undefined,
        ...(extra && "description" in extra ? { description: extra.description } : {}),
      });
      if (payload.folder_id !== undefined) {
        updated = await apiSetNoteFolder(id, payload.folder_id);
      }
      return toNote(updated, teamId);
    },

    async deleteNote(id) {
      await apiDeleteResearchNote(id);
    },

    async listReplies(id) {
      const replies = await apiListNoteReplies(id);
      return replies.map((n) => toNote(n, teamId));
    },

    async createReply(id, bodyMarkdown) {
      const reply = await apiCreateNoteReply(id, {
        body: bodyMarkdown,
        created_by: currentUserId,
        trees: [treeId],
      });
      return toNote(reply, teamId);
    },

    async listNoteFolders(_teamId, opts) {
      const [folders, notes] = await Promise.all([apiListFolders(currentUserId), apiListResearchNotes(treeId)]);
      const counts = new Map<string, number>();
      for (const n of notes) {
        // Real folders are a personal organizing tool here (see this
        // file's own doc comment) -- a folder's count is always scoped to
        // its own owner, same as `listNotes` above.
        if (n.folder_id && n.created_by === currentUserId) counts.set(n.folder_id, (counts.get(n.folder_id) ?? 0) + 1);
      }
      const { items, total } = paginate(folders, opts?.limit, opts?.offset);
      const page: NoteFoldersPage = {
        folders: items.map((f) => toNoteFolder(f, teamId, counts.get(f.id) ?? 0)),
        total,
      };
      return page;
    },

    async createNoteFolder(payload) {
      const created = await apiCreateFolder(payload.name, currentUserId);
      return toNoteFolder(created, teamId, 0);
    },

    async renameNoteFolder(id, name) {
      const renamed = await apiRenameFolder(id, name);
      return toNoteFolder(renamed, teamId, 0);
    },

    async deleteNoteFolder(id) {
      await apiDeleteFolder(id);
    },

    async listNoteFoldersByAttachment() {
      // Clann has no entity-scoped folders (folderScope="team" only) --
      // same as Cartlann's model, see this file's own doc comment.
      return [];
    },

    listRevisions: (id) => direct.listRevisions(id),
    createRevision: (id) => direct.createRevision(id),
    deleteRevision: (noteId, revisionId) => direct.deleteRevision(noteId, revisionId),
    markNoteRead: (id) => direct.markNoteRead(id),
    listUnread: (noteIds) => direct.listUnread(noteIds),
    listSystemPrincipals: (organizationId, opts) => direct.listSystemPrincipals(organizationId, opts),
  };
}

export type { Note as TackNote, Visibility as TackVisibility };
