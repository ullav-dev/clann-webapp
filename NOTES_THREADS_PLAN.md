# Notes Threads — Implementation Plan

## Goal

Extend Research Notes so that team members can communicate by sharing notes and
replying to them. A note owner can mark a note **Shared**, making it visible to
anyone with access to the tree via a team. Any authenticated user with tree access
can reply to a shared note, creating a threaded discussion.

---

## Data model changes (clann-server)

Add two fields to the `research_note` SurrealDB table:

| Field | Type | Default | Notes |
|---|---|---|---|
| `is_shared` | `bool` | `false` | When true, visible to all users with team access to the tree |
| `parent_id` | `Option<record(research_note)>` | `null` | Set on replies; `null` for top-level notes |

`reply_count` is returned by the list endpoint as a derived field (count of child
notes per top-level note) so the sidebar can display a badge without a separate
fetch.

Replies inherit sharing: a reply is always visible to the same audience as its
parent (backend enforces this — `is_shared` is forced `true` on creation and the
endpoint only accepts replies to shared notes).

---

## Backend API changes (clann-server)

### Modified endpoints

**`GET /api/notes?tree=<name>&created_by=<user>`**

When `created_by` is omitted (shared-tree reads), the query must return:

```
notes where tree = <name>
  AND (created_by = JWT_user OR is_shared = true)
  AND parent_id IS NULL          ← never return replies in the list
```

When `created_by` is present (own-tree reads), current behaviour is preserved
plus shared notes from other members of a linked team:

```
notes where tree = <name>
  AND (created_by = <user> OR (is_shared = true AND team_access(JWT)))
  AND parent_id IS NULL
```

**`POST /api/notes`** — accept `is_shared` (bool) and `parent_id` (record ID).

**`PUT /api/notes/{id}`** — accept `is_shared` to allow toggling without a
full update.

### New endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notes/{id}/replies` | List replies to a note, ordered by `created_at` ASC |
| `POST` | `/api/notes/{id}/replies` | Create a reply; `is_shared` forced `true`; `parent_id` set automatically |

---

## Frontend changes (clann-webapp)

### `src/lib/types.ts`

Add to `ResearchNote`:
```typescript
is_shared?: boolean;
parent_id?: string | null;
reply_count?: number;      // derived; returned by list endpoint
```

Add to `CreateResearchNote` and `UpdateResearchNote`:
```typescript
is_shared?: boolean | null;
```

New type:
```typescript
export interface CreateNoteReply {
  body: string;
  created_by?: string | null;
  trees?: string[];
}
```

### `src/lib/api.ts`

```typescript
export const listNoteReplies = (noteId: string): Promise<ResearchNote[]> =>
  request(`/api/notes/${rawNoteId(noteId)}/replies`);

export const createNoteReply = (noteId: string, body: CreateNoteReply): Promise<ResearchNote> =>
  request(`/api/notes/${rawNoteId(noteId)}/replies`, {
    method: "POST",
    body: JSON.stringify(body),
  });
```

### `src/hooks/useApi.ts`

- Fix `listResearchNotes`: omit `created_by` when `activeTree.team_id` is set
  (covers both owner-of-team-tree and member-of-team-tree cases).
- Add `listNoteReplies` and `createNoteReply` wrappers.

### New: `src/components/AuthorChip.tsx`

Small, reusable author indicator used on note cards, in the view panel, and on
replies. Shows a coloured circle with the user's initial + the username label.

- `isSelf` → emerald colouring
- other authors → violet colouring

### New: `src/components/NoteThread.tsx`

Self-contained component placed below the note body in the view panel.

- Fetches replies via `useApi().listNoteReplies(noteId)` on mount.
- Renders each reply with `AuthorChip`, relative timestamp, and markdown body.
- "+ Reply" button expands an inline textarea (plain text for brevity; markdown
  preview not needed for short replies).
- On submit, calls `useApi().createNoteReply(noteId, body)` and prepends the
  new reply to the list.
- Gracefully degrades to an empty state if the backend endpoint does not yet
  exist (catches 404).

### `src/components/ResearchPage.tsx`

1. **Sidebar note list** — filter to top-level notes only (`!n.parent_id`).
2. **`NoteCard`** — add `AuthorChip` (author), share-status badge (🔒/👥), and
   reply count badge (💬 N, hidden when 0).
3. **`NoteEditor`** — add `is_shared` boolean state and a "Share with team"
   toggle; pass `showShareToggle: boolean` prop (true when
   `!!activeTree?.team_id`). Update `onSubmit` signature to include `isShared`.
4. **View panel** — show `AuthorChip` for the note author; show share status;
   append `<NoteThread>` below the body.
5. **`handleCreate` / `handleUpdate`** — pass `is_shared` through to the API.

---

## Access rules summary

| User | Own private note | Own shared note | Other's shared note | Reply |
|---|---|---|---|---|
| Note owner | ✅ R/W | ✅ R/W | ✅ Read | ✅ Create |
| Team member | — | ✅ Read | ✅ Read | ✅ Create |
| Non-member | — | — | — | — |

---

## Key design decisions

- **Two-level threads only.** Replies cannot themselves be replied to (`parent_id`
  is always set to the top-level note, never to another reply). The backend
  enforces this.
- **Replies are always shared.** There is no private reply; the act of replying
  implies the content is visible to the same audience as the parent note.
- **Plain textarea for replies.** Keeps the UI lightweight. Full markdown editing
  is available when composing top-level notes.
- **`isSharedTree` vs `isTeamLinkedTree`.** The notes list omits `created_by`
  whenever `activeTree.team_id` is set, regardless of tree ownership. This is
  broader than the person-detail fix (which only applied when the user is not the
  owner) because tree owners also need to see shared replies from members.

---

## Files changed

| File | Status |
|---|---|
| `src/lib/types.ts` | Update |
| `src/lib/api.ts` | Update |
| `src/hooks/useApi.ts` | Update |
| `src/components/AuthorChip.tsx` | New |
| `src/components/NoteThread.tsx` | New |
| `src/components/ResearchPage.tsx` | Update |
| `messages/en.json` | Update |
| `messages/de.json` | Update |
| `messages/ga.json` | Update |

Backend changes required in `clann-server` (separate repo):
- `research_note` table: add `is_shared`, `parent_id`
- List query: union own notes + shared notes; strip replies from results
- New `PUT /api/notes/{id}` field: `is_shared`
- New endpoints: `GET/POST /api/notes/{id}/replies`
