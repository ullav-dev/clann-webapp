"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useApi } from "@/hooks/useApi";

const PROFILE_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_ACCEPT = ["image/jpeg", "image/png"];
const PROFILE_ACCEPT_LABEL = "JPEG or PNG";

interface Props {
  personId: string;
  onUploaded: () => void;
  /** Override the upload function. When omitted, uploads to the profile image endpoint. */
  uploadFn?: (file: File) => Promise<void>;
  /** MIME types to accept. Defaults to JPEG and PNG (profile image). */
  accept?: string[];
  /** Human-readable list of accepted formats shown in the UI. Defaults to "JPEG or PNG". */
  acceptLabel?: string;
  /** Maximum file size in bytes. Defaults to 2 MB (profile image). */
  maxBytes?: number;
}

export default function ImageUpload({
  personId,
  onUploaded,
  uploadFn,
  accept = PROFILE_ACCEPT,
  acceptLabel = PROFILE_ACCEPT_LABEL,
  maxBytes = PROFILE_MAX_BYTES,
}: Props) {
  const api = useApi();
  const t = useTranslations("imageUpload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxMb = Math.round(maxBytes / (1024 * 1024));

  async function handleFile(file: File) {
    if (!accept.includes(file.type)) {
      return setError(t("invalidType", { types: acceptLabel }));
    }
    if (file.size > maxBytes) {
      return setError(t("fileTooLarge", { maxMb }));
    }
    setError(null);
    setUploading(true);
    try {
      await (uploadFn ? uploadFn(file) : api.uploadPersonImage(personId, file));
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-stone-300 hover:border-emerald-400 rounded-xl px-4 py-5 text-center transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={handleChange}
        />
        <p className="text-sm text-stone-500">
          {uploading ? t("uploading") : t("clickOrDrag")}
        </p>
        <p className="text-xs text-stone-400 mt-1">{t("constraints", { types: acceptLabel, maxMb })}</p>
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
