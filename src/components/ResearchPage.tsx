"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import { useApi } from "@/hooks/useApi";
import { DamPicker } from "@ullav/dam-picker";
import type { PickedAsset } from "@ullav/dam-picker";
import * as api from "@/lib/api";
import type { ResearchFolder, ResearchNote, CreateResearchNote, UpdateResearchNote } from "@/lib/types";
import WikipediaSearch from "@/components/WikipediaSearch";
import CensusSearch from "@/components/CensusSearch";
import AiChat from "@/components/AiChat";
import AuthorChip from "@/components/AuthorChip";
import NoteThread from "@/components/NoteThread";

const MarkdownEditor = dynamic(() => import("@/components/MarkdownEditor"), { ssr: false });

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── note editor form ─────────────────────────────────────────────────────────

interface EditorProps {
  initial?: ResearchNote;
  token: string;
  username: string;
  onSaved: (note: ResearchNote) => void;
  onCancel: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  showShareToggle?: boolean;
  onSubmit: (title: string, description: string, body: string, isShared: boolean) => Promise<void>;
}

function NoteEditor({ initial, token, username, onSaved, onCancel, saving, showShareToggle, onSubmit }: EditorProps) {
  const t = useTranslations("research");
  const cursorPosRef = useRef<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isShared, setIsShared] = useState(initial?.is_shared ?? false);
  const [error, setError] = useState<string | null>(null);

  function insertAssetMarkdown(asset: PickedAsset) {
    const url = asset.url.replace(/\/?$/, "/thumbnail");
    const snippet = `![${asset.name}](${url})`;
    setBody((prev) => {
      const pos = cursorPosRef.current ?? prev.length;
      const before = prev.slice(0, pos);
      const after = prev.slice(pos);
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n\n" : "";
      const suffix = after.length > 0 && !after.startsWith("\n") ? "\n\n" : "";
      return before + prefix + snippet + suffix + after;
    });
    setShowPicker(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await onSubmit(title.trim(), description.trim(), body.trim(), isShared);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <label className="block text-xs text-stone-500 mb-1">{t("fieldTitle")} *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("fieldTitlePlaceholder")}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-xs text-stone-500 mb-1">{t("fieldDescription")}</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("fieldDescriptionPlaceholder")}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-stone-500">{t("fieldBody")}</label>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="text-xs text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            {showPicker ? t("hidePicker") : t("browsePicker")}
          </button>
        </div>

        {showPicker && (
          <div className="mb-3 rounded-lg border border-stone-200 overflow-hidden max-h-64 overflow-y-auto">
            <DamPicker
              apiBase="/api/dam"
              token={token}
              username={username}
              filter={(a) => a.asset_type.startsWith("image/")}
              onSelect={(asset) => { insertAssetMarkdown(asset); }}
            />
          </div>
        )}

        <MarkdownEditor
          value={body}
          onChange={(val) => setBody(val ?? "")}
          textareaProps={{
            onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
            onKeyUp:  (e: React.KeyboardEvent<HTMLTextAreaElement>) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
            onMouseUp:(e: React.MouseEvent<HTMLTextAreaElement>) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
          }}
        />
      </div>

      {showShareToggle && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            role="checkbox"
            aria-checked={isShared}
            tabIndex={0}
            onClick={() => setIsShared((v) => !v)}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setIsShared((v) => !v); }}
            className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${isShared ? "bg-violet-600" : "bg-stone-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isShared ? "translate-x-4" : "translate-x-0"}`} />
          </div>
          <span className="text-xs text-stone-600">
            {isShared ? `👥 ${t("sharedNote")}` : `🔒 ${t("privateNote")}`}
          </span>
          <span className={`text-xs font-medium ${isShared ? "text-violet-500" : "text-stone-400"}`}>
            {isShared ? t("clickToUnshare") : t("clickToShare")}
          </span>
        </label>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}

// ─── note card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: ResearchNote;
  selected: boolean;
  canEdit: boolean;
  currentUsername: string;
  folderName?: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function NoteCard({ note, selected, canEdit, currentUsername, folderName, onSelect, onEdit, onDelete, deleting }: NoteCardProps) {
  const t = useTranslations("research");
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        selected
          ? "border-emerald-400 bg-emerald-50"
          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-stone-800 text-sm leading-snug flex-1 min-w-0 truncate">
          {note.title}
        </h3>
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="p-1 text-stone-400 hover:text-stone-700 transition-colors rounded" title={t("editNote")}>✏️</button>
            <button onClick={onDelete} disabled={deleting} className="p-1 text-stone-400 hover:text-red-500 transition-colors rounded disabled:opacity-40" title={t("deleteNote")}>🗑️</button>
          </div>
        )}
      </div>
      {note.description && (
        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{note.description}</p>
      )}
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {note.created_by && (
            <AuthorChip username={note.created_by} isSelf={note.created_by === currentUsername} />
          )}
          {note.updated_at && (
            <p className="text-[10px] text-stone-400">{formatDate(note.updated_at)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(note.reply_count ?? 0) > 0 && (
            <span className="text-[10px] text-stone-400">💬 {note.reply_count}</span>
          )}
          {note.is_shared
            ? <span className="text-[10px] text-violet-500" title={t("sharedNote")}>👥</span>
            : <span className="text-[10px] text-stone-300" title={t("privateNote")}>🔒</span>
          }
          {folderName && (
            <span className="text-[10px] text-stone-400">📁 {folderName}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ResearchPage() {
  const t = useTranslations("research");
  const tCensus = useTranslations("census");
  const tAi = useTranslations("aiChat");
  const { user, roles, token } = useAuth();
  const { activeTree, isLoading: treeLoading } = useTree();
  const apiHook = useApi();
  const searchParams = useSearchParams();

  // When navigating from a person's detail page, personId is provided as a query param.
  const aiPersonId = searchParams.get("personId") ?? undefined;

  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "create" | "edit" | "wikipedia" | "census" | "ai" | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Pre-fill state for "Save as Note" from Wikipedia
  const [prefill, setPrefill] = useState<{ title: string; description: string; body: string } | null>(null);
  // Note context injected into AI chat via "Dig deeper"
  const [aiNoteContext, setAiNoteContext] = useState<{ title: string; body: string } | null>(null);
  // Person name pre-fill for Census search (derived from aiPersonId URL param)
  const [censusPersonName, setCensusPersonName] = useState<{ forename: string; surname: string } | null>(null);

  // Folder state — "all" | "unfiled" | "shared-by-me" | "shared-by-others" | folder ID string
  const [folders, setFolders] = useState<ResearchFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<"all" | "unfiled" | "shared-by-me" | "shared-by-others" | string>("all");
  const [allNotesRevealed, setAllNotesRevealed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sharedLastRefreshed, setSharedLastRefreshed] = useState<Date | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const isAdmin = roles.includes("admin");
  // Only top-level notes appear in the sidebar; replies are shown in NoteThread.
  const topLevelNotes = notes.filter((n) => !n.parent_id);
  const selectedNote = topLevelNotes.find((n) => n.id === selectedId) ?? null;
  const showShareToggle = apiHook.isTeamLinkedTree;

  const canEditNote = (note: ResearchNote) =>
    isAdmin || (!!user && user.username === note.created_by);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiHook.listResearchNotes();
      setNotes(data);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTree?.name, user?.username]);

  const loadFolders = useCallback(async () => {
    try {
      const data = await apiHook.listFolders();
      setFolders(data);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  useEffect(() => { load(); loadFolders(); }, [load, loadFolders]);

  // Auto-open AI panel when arriving from a person's detail page.
  useEffect(() => {
    if (aiPersonId) setMode("ai");
  }, [aiPersonId]);

  // Pre-fill Census form with the person's name when arriving from a person's detail page.
  useEffect(() => {
    if (!aiPersonId) return;
    api.getPerson(aiPersonId).then((person) => {
      setCensusPersonName({ forename: person.first_name, surname: person.family_name });
    }).catch(() => {});
  }, [aiPersonId]);

  // Close Explore dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(id: string) {
    if (mode === "create") return;
    if (selectedId === id && mode === "view") {
      setSelectedId(null);
      setMode(null);
    } else {
      setSelectedId(id);
      setMode("view");
    }
  }

  function handleNewNote() {
    setSelectedId(null);
    setPrefill(null);
    setMode("create");
  }

  function handleSaveAsNote(title: string, description: string, body: string) {
    setSelectedId(null);
    setPrefill({ title, description, body });
    setMode("create");
  }

  function handleDigDeeper(note: ResearchNote) {
    setAiNoteContext({ title: note.title, body: note.body ?? "" });
    setMode("ai");
  }

  function handleEdit(note: ResearchNote) {
    setSelectedId(note.id);
    setMode("edit");
  }

  async function handleDelete(note: ResearchNote) {
    if (!confirm(t("deleteConfirm", { title: note.title }))) return;
    setDeletingId(note.id);
    try {
      await apiHook.deleteResearchNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (selectedId === note.id) { setSelectedId(null); setMode(null); }
    } catch {
      alert(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const created = await apiHook.createFolder(newFolderName.trim());
      setFolders((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName("");
      setCreatingFolder(false);
    } catch {
      alert(t("createFolderFailed"));
    }
  }

  async function handleRenameFolder(folderId: string, name: string) {
    if (!name.trim()) { setRenamingFolderId(null); return; }
    try {
      const updated = await apiHook.renameFolder(folderId, name.trim());
      setFolders((prev) => prev.map((f) => f.id === updated.id ? updated : f).sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      alert(t("renameFolderFailed"));
    } finally {
      setRenamingFolderId(null);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    if (!confirm(t("deleteFolderConfirm", { name: folder.name }))) return;
    try {
      await apiHook.deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      // Unfile notes that belonged to this folder in local state
      setNotes((prev) => prev.map((n) => n.folder_id === folderId ? { ...n, folder_id: null } : n));
      if (activeFolder === folderId) setActiveFolder("all");
    } catch {
      alert(t("deleteFolderFailed"));
    }
  }

  async function handleRefreshNotes() {
    setRefreshing(true);
    try {
      const data = await apiHook.listResearchNotes();
      setNotes(data);
      if (activeFolder === "shared-by-others" || activeFolder === "shared-by-me") setSharedLastRefreshed(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  // Auto-refresh every 60 s while a shared folder is active.
  useEffect(() => {
    if (activeFolder !== "shared-by-others" && activeFolder !== "shared-by-me") return;
    setSharedLastRefreshed(new Date());
    const id = setInterval(() => { handleRefreshNotes(); }, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder]);

  function selectFolder(id: "all" | "unfiled" | "shared-by-me" | "shared-by-others" | string) {
    setActiveFolder(id);
    setSelectedId(null);
    setMode(null);
  }

  async function handleMoveNote(noteId: string, folderId: string | null) {
    try {
      const updated = await apiHook.setNoteFolder(noteId, folderId);
      setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
    } catch {
      alert(t("moveFailed"));
    }
  }

  async function handleCreate(title: string, description: string, body: string, isShared: boolean) {
    setSaving(true);
    try {
      const virtualFolders = ["all", "unfiled", "shared-by-me", "shared-by-others"];
      const folderId = !virtualFolders.includes(activeFolder) ? activeFolder : null;
      const payload: CreateResearchNote = {
        title,
        description: description || null,
        body: body || null,
        trees: activeTree ? [activeTree.name] : [],
        folder_id: folderId,
        created_by: user?.username ?? null,
        is_shared: isShared,
      };
      const created = await apiHook.createResearchNote(payload);
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setMode("view");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(title: string, description: string, body: string, isShared: boolean) {
    if (!selectedNote) return;
    setSaving(true);
    try {
      const payload: UpdateResearchNote = {
        title,
        description: description || null,
        body: body || null,
        trees: selectedNote.trees,
        is_shared: isShared,
      };
      const updated = await apiHook.updateResearchNote(selectedNote.id, payload);
      setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      setMode("view");
    } finally {
      setSaving(false);
    }
  }

  if (treeLoading || !user) return null;

  if (!activeTree) {
    return (
      <div className="text-center py-20 text-stone-400">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-lg font-medium text-stone-600">{t("noTreeTitle")}</p>
        <p className="text-sm mt-1">{t("noTreeDescription")}</p>
      </div>
    );
  }

  const rightPanel = () => {
    if (mode === "ai") {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6 h-full">
          <AiChat onSaveAsNote={handleSaveAsNote} personId={aiPersonId} noteContext={aiNoteContext} />
        </div>
      );
    }

    if (mode === "wikipedia") {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <WikipediaSearch onSaveAsNote={handleSaveAsNote} />
        </div>
      );
    }

    if (mode === "census") {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-stone-800">{tCensus("title")}</h2>
          <CensusSearch
            initialForename={censusPersonName?.forename ?? ""}
            initialSurname={censusPersonName?.surname ?? ""}
          />
        </div>
      );
    }

    if (mode === "create") {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-4">{t("newNote")}</h2>
          <NoteEditor
            initial={prefill ? { title: prefill.title, description: prefill.description, body: prefill.body } as ResearchNote : undefined}
            token={token ?? ""}
            username={user.username}
            saving={saving}
            setSaving={setSaving}
            showShareToggle={showShareToggle}
            onSubmit={handleCreate}
            onSaved={() => {}}
            onCancel={() => { setPrefill(null); setMode(null); }}
          />
        </div>
      );
    }

    if (mode === "edit" && selectedNote) {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-4">{t("editNote")}</h2>
          <NoteEditor
            initial={selectedNote}
            token={token ?? ""}
            username={user.username}
            saving={saving}
            setSaving={setSaving}
            showShareToggle={showShareToggle}
            onSubmit={handleUpdate}
            onSaved={() => {}}
            onCancel={() => setMode("view")}
          />
        </div>
      );
    }

    if (mode === "view" && selectedNote) {
      return (
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-stone-800">{selectedNote.title}</h2>
              {selectedNote.description && (
                <p className="text-sm text-stone-500 mt-0.5">{selectedNote.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDigDeeper(selectedNote)}
                className="text-sm text-violet-700 hover:text-violet-800 font-medium transition-colors"
              >
                🤖 {t("digDeeper")}
              </button>
              {canEditNote(selectedNote) && (
                <button
                  onClick={() => handleEdit(selectedNote)}
                  className="text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                >
                  {t("editNote")}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {selectedNote.created_by && (
              <AuthorChip
                username={selectedNote.created_by}
                isSelf={selectedNote.created_by === user.username}
                size="sm"
              />
            )}
            {selectedNote.updated_at && (
              <p className="text-xs text-stone-400">{t("lastEdited")}: {formatDate(selectedNote.updated_at)}</p>
            )}
            {selectedNote.is_shared
              ? <span className="text-xs text-violet-600 font-medium">👥 {t("sharedNote")}</span>
              : <span className="text-xs text-stone-400">🔒 {t("privateNote")}</span>
            }
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-stone-400">📁</span>
              <select
                value={selectedNote.folder_id ?? ""}
                onChange={(e) => handleMoveNote(selectedNote.id, e.target.value || null)}
                className="text-xs text-stone-600 border border-stone-200 rounded px-2 py-1 focus:border-emerald-500 focus:outline-none bg-white"
              >
                <option value="">{t("noFolder")}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedNote.body ? (
            <div className="prose prose-stone prose-sm max-w-none border-t border-stone-100 pt-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
              >{selectedNote.body}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-stone-400 italic border-t border-stone-100 pt-4">{t("emptyBody")}</p>
          )}

          {selectedNote.is_shared && (
            <NoteThread note={selectedNote} />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-48 text-stone-400 rounded-xl border-2 border-dashed border-stone-200">
        <span className="text-4xl mb-3">📝</span>
        <p className="text-sm">{t("selectOrCreate")}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">{t("title")}</h1>
          <p className="text-stone-500 mt-1 text-sm">
            {loading ? t("loading") : t("noteCount", { count: notes.length })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => {
              if (mode === "ai") { setMode(null); setAiNoteContext(null); }
              else setMode("ai");
            }}
            title={tAi("toggleTooltip")}
            className={`inline-flex items-center gap-1.5 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border ${
              mode === "ai"
                ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
            }`}
          >
            🤖 {tAi("toggle")}
          </button>
          <button
            onClick={() => setMode(mode === "wikipedia" ? null : "wikipedia")}
            className={`inline-flex items-center gap-1.5 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border ${
              mode === "wikipedia"
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
            }`}
          >
            🌐 {t("wikiToggle")}
          </button>
          {/* Explore dropdown */}
          <div ref={exploreRef} className="relative">
            <button
              onClick={() => setExploreOpen((o) => !o)}
              title={t("exploreTooltip")}
              className={`inline-flex items-center gap-1.5 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border ${
                mode === "census"
                  ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                  : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
              }`}
            >
              🗂️ {t("exploreToggle")}
              <svg className={`w-3.5 h-3.5 transition-transform ${exploreOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {exploreOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setMode(mode === "census" ? null : "census"); setExploreOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    mode === "census"
                      ? "bg-emerald-50 text-emerald-800 font-medium"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span>📜</span>
                  <span>{tCensus("toggle")}</span>
                  {mode === "census" && <span className="ml-auto text-emerald-600 text-xs">✓</span>}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleNewNote}
            className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            <span>+</span> {t("newNote")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left panel: folder sidebar + note list */}
        <div className="lg:w-80 shrink-0">
          {/* Folder sidebar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {t("foldersTitle")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefreshNotes}
                  disabled={refreshing}
                  className="text-stone-400 hover:text-emerald-700 transition-colors text-sm leading-none px-1 disabled:opacity-40"
                  title={t("refresh")}
                >
                  {refreshing ? "⏳" : "↻"}
                </button>
                <button
                  onClick={() => { setCreatingFolder(true); setNewFolderName(""); }}
                  className="text-stone-400 hover:text-emerald-700 transition-colors text-base leading-none px-1"
                  title={t("newFolderPlaceholder")}
                >
                  +
                </button>
              </div>
            </div>

            {/* All Notes / Unfiled */}
            {(["all", "unfiled"] as const).map((key) => (
              <button
                key={key}
                onClick={() => selectFolder(key)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
                  activeFolder === key
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {key === "all" ? t("allNotes") : t("unfiled")}
              </button>
            ))}

            {/* "Shared with team" / "Shared by team" virtual folders — only on team-linked trees */}
            {apiHook.isTeamLinkedTree && (
              <>
                <div className={`flex items-center gap-1 rounded-md transition-colors ${
                  activeFolder === "shared-by-me" ? "bg-violet-50" : "hover:bg-stone-100"
                }`}>
                  <button
                    onClick={() => selectFolder("shared-by-me")}
                    className={`flex-1 text-left text-xs px-2 py-1.5 transition-colors ${
                      activeFolder === "shared-by-me"
                        ? "text-violet-700 font-medium"
                        : "text-stone-600"
                    }`}
                  >
                    📤 {t("sharedWithTeam")}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRefreshNotes(); }}
                    disabled={refreshing}
                    title={sharedLastRefreshed ? `${t("refresh")} · ${t("lastRefreshed")}: ${sharedLastRefreshed.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : t("refresh")}
                    className={`shrink-0 mr-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors disabled:opacity-40 ${
                      activeFolder === "shared-by-me"
                        ? "border-violet-200 text-violet-500 hover:bg-violet-100"
                        : "border-stone-200 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {refreshing ? "⏳" : "↻"}
                  </button>
                </div>
                <div className={`flex items-center gap-1 rounded-md transition-colors ${
                  activeFolder === "shared-by-others" ? "bg-violet-50" : "hover:bg-stone-100"
                }`}>
                  <button
                    onClick={() => selectFolder("shared-by-others")}
                    className={`flex-1 text-left text-xs px-2 py-1.5 transition-colors ${
                      activeFolder === "shared-by-others"
                        ? "text-violet-700 font-medium"
                        : "text-stone-600"
                    }`}
                  >
                    👥 {t("sharedByTeam")}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRefreshNotes(); }}
                    disabled={refreshing}
                    title={sharedLastRefreshed ? `${t("refresh")} · ${t("lastRefreshed")}: ${sharedLastRefreshed.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : t("refresh")}
                    className={`shrink-0 mr-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors disabled:opacity-40 ${
                      activeFolder === "shared-by-others"
                        ? "border-violet-200 text-violet-500 hover:bg-violet-100"
                        : "border-stone-200 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {refreshing ? "⏳" : "↻"}
                  </button>
                </div>
              </>
            )}

            <hr className="border-stone-200 my-1" />

            {/* User folders */}
            {folders.map((folder) =>
              renamingFolderId === folder.id ? (
                <form
                  key={folder.id}
                  onSubmit={(e) => { e.preventDefault(); handleRenameFolder(folder.id, renameFolderName); }}
                  className="px-1 py-0.5"
                >
                  <input
                    autoFocus
                    value={renameFolderName}
                    onChange={(e) => setRenameFolderName(e.target.value)}
                    onBlur={() => handleRenameFolder(folder.id, renameFolderName)}
                    className="w-full text-xs border border-emerald-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </form>
              ) : (
                <div
                  key={folder.id}
                  className={`group flex items-center gap-1 rounded-md transition-colors ${
                    activeFolder === folder.id ? "bg-emerald-50" : "hover:bg-stone-100"
                  }`}
                >
                  <button
                    onClick={() => selectFolder(folder.id)}
                    className={`flex-1 text-left text-xs px-2 py-1.5 truncate ${
                      activeFolder === folder.id ? "text-emerald-700 font-medium" : "text-stone-600"
                    }`}
                  >
                    📁 {folder.name}
                  </button>
                  <div className="hidden group-hover:flex items-center pr-1 gap-0.5">
                    <button
                      onClick={() => { setRenamingFolderId(folder.id); setRenameFolderName(folder.name); }}
                      className="p-0.5 text-stone-300 hover:text-stone-600 transition-colors text-xs"
                      title={t("renameFolder")}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="p-0.5 text-stone-300 hover:text-red-500 transition-colors text-xs"
                      title={t("deleteFolder")}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            )}

            {/* New folder inline input */}
            {creatingFolder && (
              <form
                onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}
                className="px-1 py-0.5"
              >
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }}
                  placeholder={t("newFolderPlaceholder")}
                  className="w-full text-xs border border-emerald-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </form>
            )}

            <div className="border-t border-stone-100 mt-2 mb-2" />
          </div>

          {/* Note list */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-stone-400 py-8 text-center">{t("loading")}</div>
            ) : (() => {
              const filteredNotes =
                activeFolder === "unfiled" ? topLevelNotes.filter((n) => !n.folder_id && n.created_by === user.username) :
                activeFolder === "shared-by-me" ? topLevelNotes.filter((n) => n.is_shared && n.created_by === user.username) :
                activeFolder === "shared-by-others" ? topLevelNotes.filter((n) => n.is_shared && n.created_by !== user.username) :
                activeFolder !== "all" ? topLevelNotes.filter((n) => n.folder_id === activeFolder) :
                topLevelNotes;

              if (activeFolder === "all" && !allNotesRevealed) {
                return (
                  <div className="text-center py-10 text-stone-400">
                    <p className="text-sm text-stone-500 mb-3">
                      {topLevelNotes.length} {topLevelNotes.length === 1 ? t("notesSingular") : t("notesPlural")}
                    </p>
                    <button
                      onClick={() => setAllNotesRevealed(true)}
                      className="text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                    >
                      {t("showAllNotes")}
                    </button>
                  </div>
                );
              }

              return filteredNotes.length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <p className="text-sm">{t("empty")}</p>
                  <button
                    onClick={handleNewNote}
                    className="mt-3 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    {t("addFirstNote")}
                  </button>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const folderName = folders.find((f) => f.id === note.folder_id)?.name;
                  return (
                    <NoteCard
                      key={note.id}
                      note={note}
                      selected={selectedId === note.id}
                      canEdit={canEditNote(note)}
                      currentUsername={user.username}
                      folderName={activeFolder === "all" ? folderName : undefined}
                      onSelect={() => handleSelect(note.id)}
                      onEdit={() => handleEdit(note)}
                      onDelete={() => handleDelete(note)}
                      deleting={deletingId === note.id}
                    />
                  );
                })
              );
            })()}
          </div>
        </div>

        {/* Editor / viewer panel */}
        <div className="flex-1 min-w-0">
          {rightPanel()}
        </div>
      </div>
    </div>
  );
}
