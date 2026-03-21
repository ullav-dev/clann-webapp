"use client";

import { useState, useRef, useEffect } from "react";
import { useTree } from "@/contexts/TreeContext";
import { useTranslations } from "next-intl";

export default function TreeSelector() {
  const { trees, activeTree, isLoading, setActiveTree, createTree, deleteTree } = useTree();
  const t = useTranslations("trees");

  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newName, setNewName] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setError(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleDisplayNameChange(val: string) {
    setNewDisplayName(val);
    if (!nameManuallyEdited) {
      setNewName(
        val.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createTree(newName.trim(), newDisplayName.trim());
      setNewDisplayName("");
      setNewName("");
      setNameManuallyEdited(false);
      setShowCreate(false);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(name: string, displayName: string) {
    if (!confirm(t("deleteConfirm", { name: displayName }))) return;
    try {
      await deleteTree(name);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("deleteFailed"));
    }
  }

  if (isLoading) {
    return <span className="text-sm text-stone-400">{t("loading")}</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); setShowCreate(false); setError(null); }}
        className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
      >
        <span className="max-w-[9rem] truncate">
          {activeTree ? activeTree.display_name : t("noTree")}
        </span>
        <svg className="w-3 h-3 shrink-0 text-stone-400" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 7L0 2h10L5 7z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl border border-stone-200 shadow-lg z-50">
          {trees.length === 0 ? (
            <p className="px-3 py-3 text-sm text-stone-400 text-center">{t("noTreesYet")}</p>
          ) : (
            <ul className="py-1 max-h-60 overflow-y-auto divide-y divide-stone-50">
              {trees.map((tree) => (
                <li key={tree.name} className="flex items-center gap-1 px-2 py-1.5 hover:bg-stone-50 group">
                  <button
                    onClick={() => { setActiveTree(tree); setOpen(false); }}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className={`text-sm truncate ${activeTree?.name === tree.name ? "font-semibold text-emerald-700" : "text-stone-700"}`}>
                      {tree.display_name}
                    </span>
                    {tree.is_primary && (
                      <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                        {t("primary")}
                      </span>
                    )}
                    {activeTree?.name === tree.name && (
                      <svg className="shrink-0 ml-auto w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(tree.name, tree.display_name)}
                    title={t("deleteTitle")}
                    className="shrink-0 p-1 rounded text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-stone-100">
            {showCreate ? (
              <form onSubmit={handleCreate} className="p-3 space-y-2">
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div>
                  <input
                    type="text"
                    required
                    placeholder={t("displayNamePlaceholder")}
                    value={newDisplayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    className="w-full text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <div>
                  <input
                    type="text"
                    required
                    placeholder={t("namePlaceholder")}
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setNameManuallyEdited(true); }}
                    pattern="[a-z0-9][a-z0-9-]*"
                    title={t("nameHint")}
                    className="w-full text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-xs text-stone-400 mt-1">{t("nameHint")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
                  >
                    {creating ? t("creating") : t("create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setError(null); setNewDisplayName(""); setNewName(""); setNameManuallyEdited(false); }}
                    className="flex-1 border border-stone-300 text-stone-600 text-sm py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
              >
                + {t("createNew")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
