"use client";

import { useRef, useState } from "react";
import { uploadPersonImage } from "@/lib/api";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ACCEPTED = ["image/jpeg", "image/png"];

interface Props {
  personId: string;
  onUploaded: () => void;
}

export default function ImageUpload({ personId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      return setError("Only JPEG or PNG files are accepted.");
    }
    if (file.size > MAX_BYTES) {
      return setError("File must be 3 MB or smaller.");
    }
    setError(null);
    setUploading(true);
    try {
      await uploadPersonImage(personId, file);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
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
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleChange}
        />
        <p className="text-sm text-stone-500">
          {uploading ? "Uploading…" : "Click or drag a photo here"}
        </p>
        <p className="text-xs text-stone-400 mt-1">JPEG or PNG · max 3 MB</p>
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
