"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useTree } from "@/contexts/TreeContext";
import { uploadTreeImage, treeImageUrl } from "@/lib/api";
import { FamilyTree } from "@/lib/types";
import ImageUpload from "./ImageUpload";

interface Props {
  tree: FamilyTree;
  onClose: () => void;
}

export default function TreeSettingsModal({ tree, onClose }: Props) {
  const { renameTree, refreshTree } = useTree();
  const t = useTranslations("treeSettings");
  const tTrees = useTranslations("trees");

  const [displayName, setDisplayName] = useState(tree.display_name);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasAvatar = !!tree.image_path;

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed || trimmed === tree.display_name) { onClose(); return; }
    setRenaming(true);
    setRenameError(null);
    try {
      await renameTree(tree.name, trimmed);
      onClose();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : tTrees("renameFailed"));
    } finally {
      setRenaming(false);
    }
  }

  async function handleUpload(file: File) {
    setUploadError(null);
    try {
      await uploadTreeImage(tree.name, file);
      await refreshTree(tree.name);
      setAvatarVersion((v) => v + 1);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("uploadFailed"));
      throw err;
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-800 text-lg">{t("title")}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label={t("close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Avatar section */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-stone-700">{t("avatarLabel")}</p>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-16 h-16 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center">
              {hasAvatar ? (
                <img
                  src={`${treeImageUrl(tree.name)}?v=${avatarVersion}`}
                  alt={tree.display_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-2xl select-none">🌳</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-500 mb-2">{t("avatarHint")}</p>
              {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}
            </div>
          </div>
          <ImageUpload
            personId=""
            uploadFn={handleUpload}
            onUploaded={() => {}}
            accept={["image/jpeg", "image/png"]}
            acceptLabel="JPG or PNG"
            maxBytes={2 * 1024 * 1024}
          />
        </div>

        {/* Rename section */}
        <form onSubmit={handleRename} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">{t("displayNameLabel")}</span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          {renameError && <p className="text-xs text-red-600">{renameError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-stone-300 text-stone-600 text-sm py-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              {tTrees("cancel")}
            </button>
            <button
              type="submit"
              disabled={renaming}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {renaming ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
