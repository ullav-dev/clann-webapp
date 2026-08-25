// Adapts clann-server's own `/api/notes`/`/api/folders` REST API to the
// `TackNotesApi` interface `@ullav-dev/tack-notes`'s components expect, so
// `TackNotesPanel`/`TackNoteThread` can be used here exactly as in every
// other app in the tack-server notes migration
// (/Users/colin/.claude/plans/linked-roaming-rabbit.md).
//
// PHASE 3 STATUS: this is the real, production wiring — clann-server's own
// `/api/notes`/`/api/folders` handlers now call tack-server via
// `tack_client.rs` (research_note.rs/research_folder.rs, "Design B": they
// return tack-shaped JSON directly, a near-passthrough of tack's own
// `Note` plus `description`), so this adapter is a thin reshape, not a
// client-side ACL/filter layer the way the old Phase 0 spike version was.
// `entityId`/`treeId` below is a tree's `name` slug — clann-server's real
// `GET /api/notes?tree=` and `POST /api/notes`'s `tree` field both key on
// the name, not the resolved `family_tree` UUID (confirmed directly
// against `handlers::research_note::resolve_tree`).
//
// This is still a *hybrid* adapter, not a plain `createTackNotesApi`
// pointed at clann-server's base URL, for one remaining reason:
// `description` has no column in tack's own `Note` schema — carried here
// via the `extra` passthrough (`ResearchNotesPanel`'s own
// `renderComposerExtra`/`onBeforeSave`), same as Cartlann's adapter does
// for its own `description`/`object_ids` extras. clann-server's own
// `tack_note_meta` sidecar is what actually persists it server-side; this
// file just carries it across the wire.
//
// Per-tree visibility, which the old Phase 0 spike's own doc comment
// called out as a real ACL gap, is now enforced server-side
// (`handlers::research_note::resolve_team_for_tree`, forwarding the
// caller's own JWT — never an admin token, see `tack_client.rs`'s own doc
// comment) — this adapter does no client-side filtering of its own.
//
// Pure-tack features with no Clann-specific meaning at all (revisions,
// unread tracking, system principals) delegate straight to a real
// `createTackNotesApi` bound to the same-origin `/api/tack/*` proxy (see
// proxy.ts).
//
// Folders: `research_folder` stays in SurrealDB as a personal-per-user name
// registry (`created_by`+`name` UNIQUE, no tree/team column at all — see
// clann-server's `models/research_folder.rs` doc comment) — a folder
// resolves to a real tack folder only when a team note actually gets filed
// into it, entirely server-side (`resolve_or_create_tack_folder`). This
// adapter surfaces that personal registry via `folderScope="entity"`'s
// `listNoteFoldersByAttachment`/`createNoteFolder`/etc. (owningService/
// entityType/entityId args ignored — Clann's folders were never per-tree
// scoped, even before this migration: `ResearchPage.tsx`'s old folder
// sidebar listed the same personal set regardless of which tree was
// active). A personal (team-less) note CAN be filed too (clann-server PR
// #63) — it just never resolves to a real tack folder (tack's own
// `note_folders` are always `team_id`-scoped); the filing is recorded as
// clann-server-side metadata only (`tack_note_meta.legacy_folder_id`),
// which is sound because a personal note is always private and only ever
// visible to its own creator, so filing it into one of that creator's own
// personal folders raises no ACL question a team folder would. An earlier
// version of this migration rejected this outright, on the mistaken
// assumption that "needs a real tack folder" and "can be filed at all"
// were the same constraint.
//
// Folders stay username-keyed (`ClannAuth::username`, unrelated to tack's
// UUID-keyed user identity) — `research_folder.created_by` was never part
// of the identity flip below, since folders never round-trip through tack.
//
// IDENTITY: `createNote`/`updateNote`/`createReply` below round-trip
// through tack-server now, so `note.created_by` is a real UUM user UUID
// (`ClannAuth::user_id`, enforced server-side — never client-supplied,
// see `models/research_note.rs`'s own doc comment on this hardening).
// This is the flip the old adapter's own "PHASE 3 CUTOVER TRAP" comment
// pinned: `currentUserId` here (and every call site passing it in, see
// `ResearchNotesPanel.tsx`) is `user.id`, not `user.username` — that flip
// has now landed, in the same change as the handler repoint it was pinned
// against.

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
  type TackNotesApi,
} from "@ullav-dev/tack-notes";

/** `Note`, widened with `description` — the one Clann-specific field
 * `@ullav-dev/tack-notes` itself has no concept of. Every note this
 * adapter returns is actually one of these. */
export interface ClannNote extends Note {
  description: string | null;
}

function toNote(rn: ResearchNote): ClannNote {
  return {
    id: rn.id,
    organization_id: "", // unused by any tack-notes component; clann-server's own API doesn't expose it
    team_id: rn.team_id,
    parent_id: rn.parent_id,
    folder_id: rn.folder_id,
    visibility: rn.visibility,
    title: rn.title,
    body_markdown: rn.body_markdown,
    created_by: rn.created_by,
    created_at: rn.created_at,
    updated_at: rn.updated_at,
    reply_count: rn.reply_count,
    in_reply_to_version: null,
    description: rn.description,
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

/** `token`/`currentUsername`/`treeName` are captured at creation time,
 *  matching `createTackNotesApi`'s own shape — callers rebuild this per
 *  token/user/tree change (e.g. in a `useMemo`).
 *
 *  `currentUsername` is the caller's own UUM *username* — used only for
 *  the personal-folder registry (`listFolders`/`createFolder`), which
 *  stays username-keyed; it plays no role in note authorship, which the
 *  server always derives from the caller's own JWT now (see this file's
 *  own "IDENTITY" doc comment). */
export function createClannTackNotesApi(
  token: string,
  currentUsername: string,
  treeName: string
): TackNotesApi {
  // Pure-tack features clann-server has no reason to wrap — see this
  // file's own doc comment.
  const direct = createTackNotesApi("/api/tack", token);

  return {
    async listNotes() {
      // clann-server's `/api/notes` is always tree-scoped (`?tree=`), never
      // team-scoped the way tack's own `GET /notes` is — `ResearchNotesPanel`
      // uses `listMode="entity"` (the default), so this is never actually
      // called; kept only for `TackNotesApi` interface completeness.
      const notes = await apiListResearchNotes(treeName);
      return { notes: notes.map(toNote), total: notes.length, has_more: false };
    },

    async getNote(id) {
      return toNote(await apiGetResearchNote(id));
    },

    async createNote(payload) {
      const extra = payload.extra as { description?: string | null } | undefined;
      const created = await apiCreateResearchNote({
        title: payload.title,
        description: extra?.description ?? null,
        body: payload.body_markdown,
        tree: treeName,
        folder_id: payload.folder_id ?? null,
        visibility: payload.visibility,
      });
      return toNote(created);
    },

    async listNotesByAttachment(owningService, entityType, entityId) {
      if (owningService !== "clann" || entityType !== "tree") return [];
      const notes = await apiListResearchNotes(entityId);
      return notes.filter((n) => !n.parent_id).map(toNote);
    },

    async updateNote(id, payload) {
      const extra = payload.extra as { description?: string | null } | undefined;
      let updated = await apiUpdateResearchNote(id, {
        title: payload.title,
        body: payload.body_markdown,
        visibility: payload.visibility,
        ...(extra && "description" in extra ? { description: extra.description } : {}),
      });
      if (payload.folder_id !== undefined) {
        updated = await apiSetNoteFolder(id, payload.folder_id ?? null);
      }
      return toNote(updated);
    },

    async deleteNote(id) {
      await apiDeleteResearchNote(id);
    },

    async listReplies(id) {
      const replies = await apiListNoteReplies(id);
      return replies.map(toNote);
    },

    async createReply(id, bodyMarkdown) {
      const reply = await apiCreateNoteReply(id, { body: bodyMarkdown });
      return toNote(reply);
    },

    async listNoteFolders() {
      const folders = await apiListFolders(currentUsername);
      return { folders: folders.map((f) => toNoteFolder(f, null, 0)), total: folders.length };
    },

    async createNoteFolder(payload) {
      const created = await apiCreateFolder(payload.name);
      return toNoteFolder(created, null, 0);
    },

    async renameNoteFolder(id, name) {
      const renamed = await apiRenameFolder(id, name);
      return toNoteFolder(renamed, null, 0);
    },

    async deleteNoteFolder(id) {
      await apiDeleteFolder(id);
    },

    async listNoteFoldersByAttachment() {
      // Clann's folders were never entity/tree-scoped, even pre-migration
      // (see this file's own doc comment) — the same personal registry,
      // regardless of which tree is active.
      const folders = await apiListFolders(currentUsername);
      return folders.map((f) => toNoteFolder(f, null, 0));
    },

    listRevisions: (id) => direct.listRevisions(id),
    createRevision: (id) => direct.createRevision(id),
    deleteRevision: (noteId, revisionId) => direct.deleteRevision(noteId, revisionId),
    markNoteRead: (id) => direct.markNoteRead(id),
    listUnread: (noteIds) => direct.listUnread(noteIds),
    listSystemPrincipals: (organizationId, opts) => direct.listSystemPrincipals(organizationId, opts),
  };
}

export type { Note as TackNote, Visibility as TackVisibility } from "@ullav-dev/tack-notes";
