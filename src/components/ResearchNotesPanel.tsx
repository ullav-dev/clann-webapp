"use client";

// Clann's Research Notes UI. Custom two-pane layout — **navigator on the
// left, note editor/reader on the right** — the pre-migration Clann UX.
//
// Why not `@ullav-dev/tack-notes`'s all-in-one `TackNotesPanel`: its
// `twoColumn` mode hard-wires the note list AND the create-composer together
// in the LEFT pane (reader only on the right), so the navigator ends up
// stacked under the composer — not the layout Clann wants. And its
// lower-level `TackNoteTree` navigator is *team*-scoped, whereas Clann scopes
// notes *per-tree* (entity attachment). So the left navigator here is a
// bespoke list built on Clann's own tree-scoped `listNotesByAttachment`.
//
// The RIGHT pane reuses the package's `TackNoteThread` (view / edit / reply /
// delete) unchanged — it's scope-agnostic (just a `noteId` + `api`) and keeps
// the Clann `description` sidecar working in edit mode via its
// `renderComposerExtra`/`onBeforeSave` hooks, exactly as the old
// `TackNotesPanel` integration did. Creating a new note uses a small composer
// (also on the right), since `TackNoteThread` only edits an existing note.
//
// Preserved from the previous integration: `description` sidecar (create +
// edit), the DAM image picker, "Dig deeper with AI", and "Save as Note"
// pre-fill via `initialDraft`. Author display via `resolveAuthor` (self
// fast-path + team roster). `isAdmin` is Clann's own product-admin role,
// never tack's `is_admin`.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/lib/auth-api";
import { getTeam } from "@/lib/teams-api";
import type { FamilyTree, TeamUserRef } from "@/lib/types";
import { createClannTackNotesApi, type ClannNote } from "@/lib/tack-notes-adapter";
import {
  NoteEventsProvider,
  useNoteEvents,
  TackNoteThread,
  type Note,
  type NoteFolder,
  type Visibility,
} from "@ullav-dev/tack-notes";
import { DamPicker, type PickedAsset } from "@ullav-dev/dam-picker";
import MarkdownEditor from "@/components/MarkdownEditor";

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

function FolderRow({
  label,
  icon,
  count,
  active,
  onClick,
  onRename,
  onDelete,
  renameTitle,
  deleteTitle,
}: {
  label: string;
  icon: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  renameTitle?: string;
  deleteTitle?: string;
}) {
  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors cursor-pointer ${
        active ? "bg-emerald-50 text-emerald-800" : "text-stone-700 hover:bg-stone-50"
      }`}
      onClick={onClick}
    >
      <span className="shrink-0 text-xs">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span className="shrink-0 text-[11px] text-stone-400 tabular-nums">{count}</span>
      {onRename && (
        <button
          type="button"
          title={renameTitle}
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-emerald-600 transition-opacity text-xs"
        >
          ✏️
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          title={deleteTitle}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-opacity text-xs"
        >
          🗑️
        </button>
      )}
    </div>
  );
}

function FolderNameInput({
  value,
  busy,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
}: {
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder: string;
}) {
  return (
    <input
      autoFocus
      value={value}
      disabled={busy}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      onBlur={onCancel}
      className="w-full rounded-md border border-emerald-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export default function ResearchNotesPanel(props: Props) {
  return (
    <NoteEventsProvider>
      <ResearchNotesInner {...props} />
    </NoteEventsProvider>
  );
}

function ResearchNotesInner({ activeTree, isAdmin, initialDraft, onInitialDraftConsumed, onDigDeeper }: Props) {
  const t = useTranslations("notes");
  const { user, token } = useAuth();
  const { subscribe, subscribeRefresh, triggerRefresh } = useNoteEvents();

  const isTeamLinkedTree = !!activeTree.team_id;

  const api = useMemo(() => {
    if (!token || !user) return null;
    return createClannTackNotesApi(token, user.username, activeTree.name);
  }, [token, user, activeTree.name]);

  // Team roster for resolveAuthor (self fast-path + team members).
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

  // TackNoteThread's resolveAuthor signature is (userId, teamId, note?).
  const resolveAuthor = useCallback(
    (userId: string): string => {
      if (user && userId === user.id) return displayName(user as AuthUser);
      return roster[userId] ?? userId.slice(0, 8);
    },
    [user, roster],
  );

  // ── Navigator list (Clann tree-scoped) ────────────────────────────────
  const [notes, setNotes] = useState<ClannNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Right-pane mode: read/edit an existing note ("view") or compose a new one.
  const [mode, setMode] = useState<"view" | "create">("view");

  // ── Folders (personal registry, cross-tree — see tack-notes-adapter.ts) ──
  // Folders are username-keyed and NOT tree-scoped; notes are. So a folder can
  // hold notes in other trees while looking empty here — counts and the
  // filtered list below are always *in-this-tree*.
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  // "all" | "unfiled" | <folderId>
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const list = (await api.listNotesByAttachment("clann", "tree", activeTree.name)) as ClannNote[];
      setNotes(list);
      setListError(null);
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, activeTree.name]);

  const loadFolders = useCallback(async () => {
    if (!api) return;
    try {
      const page = await api.listNoteFolders();
      setFolders(page.folders);
    } catch {
      /* Non-fatal: the folder sidebar just stays empty. */
    }
  }, [api]);

  useEffect(() => { setLoading(true); load(); loadFolders(); }, [load, loadFolders]);
  // TackNoteThread fires a refresh event after edit/reply/delete; refetch.
  useEffect(() => subscribeRefresh(async () => { await load(); }), [subscribeRefresh, load]);
  // A folder move in the right pane fires notifyNoteUpdated (not a refresh);
  // reload so the sidebar filter and counts stay in sync.
  useEffect(() => subscribe(() => { load(); }), [subscribe, load]);

  // ── Create composer state ─────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVisibility, setNewVisibility] = useState<Visibility>(isTeamLinkedTree ? "team" : "private");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function resetComposer() {
    setNewTitle("");
    setNewBody("");
    setNewDescription("");
    setNewVisibility(isTeamLinkedTree ? "team" : "private");
    setSaveError(null);
  }

  const startCreate = useCallback(() => {
    resetComposer();
    setSelectedId(null);
    setMode("create");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeamLinkedTree]);

  // "Save as Note" pre-fill from AI Advisor / Wikipedia / Irish Genealogy.
  // In an effect (not during render) because it calls `onInitialDraftConsumed`,
  // which updates the PARENT (`ResearchPage`) — a parent setState during this
  // component's render is illegal ("Cannot update a component while rendering a
  // different component").
  useEffect(() => {
    if (!initialDraft) return;
    setNewTitle(initialDraft.title);
    setNewBody(initialDraft.body);
    setNewDescription(initialDraft.description);
    setNewVisibility(isTeamLinkedTree ? "team" : "private");
    setSaveError(null);
    setSelectedId(null);
    setMode("create");
    onInitialDraftConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraft]);

  async function handleCreate() {
    if (!api || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = (await api.createNote({
        // team_id is required by tack's API contract but ignored by Clann's
        // adapter (which scopes by tree name); mirror the old TackNotesPanel
        // integration's `teamId={activeTree.team_id ?? ""}`.
        team_id: activeTree.team_id ?? "",
        title: newTitle,
        body_markdown: newBody,
        visibility: newVisibility,
        // Only a real folder ULID is a valid folder_id — the "all"/"unfiled"
        // virtual filters map to null (per CLAUDE.md: a virtual key saved as
        // folder_id makes the note invisible).
        folder_id: activeFolder === "all" || activeFolder === "unfiled" ? undefined : activeFolder,
        extra: { description: newDescription || null },
      })) as ClannNote;
      resetComposer();
      await load();
      setSelectedId(created.id);
      setMode("view");
      triggerRefresh();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function selectNote(id: string) {
    setSelectedId(id);
    setMode("view");
  }

  // ── Folder actions ────────────────────────────────────────────────────
  async function submitFolderName() {
    if (!api || folderBusy) return;
    const name = folderNameInput.trim();
    if (!name) return;
    setFolderBusy(true);
    setFolderError(null);
    try {
      if (renamingFolderId) {
        await api.renameNoteFolder(renamingFolderId, name);
      } else {
        const created = await api.createNoteFolder({ team_id: activeTree.team_id ?? "", name });
        setActiveFolder(created.id);
      }
      setFolderNameInput("");
      setCreatingFolder(false);
      setRenamingFolderId(null);
      await loadFolders();
    } catch (e) {
      setFolderError((e as Error).message || t("folderActionFailed"));
    } finally {
      setFolderBusy(false);
    }
  }

  async function deleteFolder(folder: NoteFolder) {
    if (!api || folderBusy) return;
    if (!window.confirm(t("deleteFolderConfirm", { name: folder.name }))) return;
    setFolderBusy(true);
    setFolderError(null);
    try {
      await api.deleteNoteFolder(folder.id);
      if (activeFolder === folder.id) setActiveFolder("all");
      await Promise.all([loadFolders(), load()]); // notes may have become unfiled
    } catch (e) {
      setFolderError((e as Error).message || t("folderActionFailed"));
    } finally {
      setFolderBusy(false);
    }
  }

  function startCreateFolder() {
    setRenamingFolderId(null);
    setFolderNameInput("");
    setFolderError(null);
    setCreatingFolder(true);
  }

  function startRenameFolder(folder: NoteFolder) {
    setCreatingFolder(false);
    setRenamingFolderId(folder.id);
    setFolderNameInput(folder.name);
    setFolderError(null);
  }

  function cancelFolderEdit() {
    setCreatingFolder(false);
    setRenamingFolderId(null);
    setFolderNameInput("");
    setFolderError(null);
  }

  // In-this-tree note counts, keyed by folder_id (null → unfiled).
  const unfiledCount = notes.filter((n) => !n.folder_id).length;
  const countFor = (folderId: string) => notes.filter((n) => n.folder_id === folderId).length;

  const visibleNotes = notes.filter((n) => {
    if (activeFolder === "all") return true;
    if (activeFolder === "unfiled") return !n.folder_id;
    return n.folder_id === activeFolder;
  });

  // Description field for editing an existing note (TackNoteThread edit mode),
  // read from the DOM at save time — same live-value approach as before.
  const editDescRef = useRef<HTMLTextAreaElement>(null);

  if (!api || !user) return null;

  const visibilityOptions: Visibility[] = isTeamLinkedTree ? ["private", "team"] : ["private"];

  return (
    <div className="flex h-full min-h-0 bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* ── LEFT: navigator ─────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-stone-200 flex flex-col min-h-0">
        <div className="p-2 border-b border-stone-200 shrink-0">
          <button
            type="button"
            onClick={startCreate}
            className={`w-full flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
              mode === "create"
                ? "bg-emerald-600 text-white"
                : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
            }`}
          >
            {t("addNote")}
          </button>
        </div>
        {/* ── Folders ──────────────────────────────────────────────────── */}
        <div className="border-b border-stone-200 shrink-0 p-2 space-y-0.5">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              {t("foldersHeading")}
            </span>
            <button
              type="button"
              onClick={startCreateFolder}
              title={t("newFolder")}
              className="text-stone-400 hover:text-emerald-600 transition-colors text-sm leading-none px-1"
            >
              +
            </button>
          </div>

          <FolderRow
            label={t("folderFilterAll")}
            icon="🗂️"
            count={notes.length}
            active={activeFolder === "all"}
            onClick={() => setActiveFolder("all")}
          />
          <FolderRow
            label={t("unfiledFilter")}
            icon="📄"
            count={unfiledCount}
            active={activeFolder === "unfiled"}
            onClick={() => setActiveFolder("unfiled")}
          />

          {folders.map((f) =>
            renamingFolderId === f.id ? (
              <FolderNameInput
                key={f.id}
                value={folderNameInput}
                busy={folderBusy}
                onChange={setFolderNameInput}
                onSubmit={submitFolderName}
                onCancel={cancelFolderEdit}
                placeholder={t("newFolderName")}
              />
            ) : (
              <FolderRow
                key={f.id}
                label={f.name}
                icon="📁"
                count={countFor(f.id)}
                active={activeFolder === f.id}
                onClick={() => setActiveFolder(f.id)}
                onRename={() => startRenameFolder(f)}
                onDelete={() => deleteFolder(f)}
                renameTitle={t("renameFolder")}
                deleteTitle={t("deleteFolder")}
              />
            ),
          )}

          {creatingFolder && (
            <FolderNameInput
              value={folderNameInput}
              busy={folderBusy}
              onChange={setFolderNameInput}
              onSubmit={submitFolderName}
              onCancel={cancelFolderEdit}
              placeholder={t("newFolderName")}
            />
          )}
          {folderError && <p className="px-1 text-xs text-red-600">{folderError}</p>}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
          {loading && <p className="px-2 py-2 text-sm text-stone-400">{t("loading")}</p>}
          {!loading && listError && <p className="px-2 py-2 text-sm text-red-600">{listError}</p>}
          {!loading && !listError && visibleNotes.length === 0 && (
            <p className="px-2 py-2 text-sm text-stone-400">
              {activeFolder === "all" ? t("noNotes") : t("noFolderNotes")}
            </p>
          )}
          {visibleNotes.map((n) => {
            const active = n.id === selectedId && mode === "view";
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => selectNote(n.id)}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                  active ? "bg-emerald-50 border border-emerald-200" : "hover:bg-stone-50 border border-transparent"
                }`}
              >
                <div className="text-sm font-medium text-stone-800 truncate">
                  {n.title?.trim() || t("untitled")}
                </div>
                {n.description?.trim() && (
                  <div className="text-xs text-stone-500 truncate mt-0.5">{n.description}</div>
                )}
                <div className="text-[11px] text-stone-400 mt-0.5">{formatDate(n.updated_at || n.created_at)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: editor / reader ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {mode === "create" ? (
          <div className="p-4 max-w-3xl mx-auto space-y-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              disabled={saving}
              className="w-full text-lg font-semibold text-stone-800 border-b border-stone-200 pb-2 focus:border-emerald-500 focus:outline-none"
            />
            <MarkdownEditor value={newBody} onChange={setNewBody} height={340} />
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t("descriptionLabel")}</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex items-center gap-2">
              <select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as Visibility)}
                disabled={saving}
                className="text-sm px-2 py-1.5 rounded-md border border-stone-300 bg-white text-stone-600 focus:border-emerald-500 focus:outline-none"
              >
                {visibilityOptions.map((v) => (
                  <option key={v} value={v}>{t(`visibility.${v}`)}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => { resetComposer(); setMode("view"); }}
                disabled={saving}
                className="text-sm text-stone-500 hover:text-stone-700 px-3 py-1.5"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !newTitle.trim()}
                className="text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
              >
                {t("save")}
              </button>
            </div>
          </div>
        ) : selectedId ? (
          <div className="p-4">
            <TackNoteThread
              key={selectedId}
              noteId={selectedId}
              api={api}
              currentUserId={user.id}
              isAdmin={isAdmin}
              resolveAuthor={resolveAuthor}
              t={t}
              // Override the thread's own self-fetch (gated on note.team_id, so
              // it never fires on personal trees) with Clann's cross-tree
              // personal folder list, so the move dropdown always appears.
              folders={folders}
              onNavigateAfterDelete={() => { setSelectedId(null); setMode("view"); triggerRefresh(); }}
              ImagePicker={DamImagePicker}
              renderComposerExtra={(note) => {
                const existing = (note as ClannNote).description ?? "";
                return (
                  <div className="mt-2" key={`edit-${note.id}`}>
                    <label className="block text-xs font-medium text-stone-600 mb-1">{t("descriptionLabel")}</label>
                    <textarea
                      ref={editDescRef}
                      defaultValue={existing}
                      rows={2}
                      className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                );
              }}
              onBeforeSave={() => ({ description: editDescRef.current?.value ?? null })}
              renderDetailHeaderActions={(note) => (
                <button
                  type="button"
                  onClick={() => onDigDeeper(note.title, note.body_markdown)}
                  className="text-sm text-violet-700 hover:text-violet-800 font-medium transition-colors"
                >
                  🤖 {t("digDeeper")}
                </button>
              )}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <p className="text-stone-400">{t("selectNote")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export type { Note };
