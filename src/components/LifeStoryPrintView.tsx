"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Person } from "@/lib/types";
import { fullName } from "@/components/PersonCard";

interface Props {
  person: Person;
  lifeImageUrl: string | null;
}

export default function LifeStoryPrintView({ person, lifeImageUrl }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasBirthInfo = person.date_of_birth || person.place_of_birth;

  if (!mounted) return null;

  return createPortal(
    <div className="life-story-print">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-stone-300">
        <h1 className="text-3xl font-bold text-stone-900 mb-1">{fullName(person)}</h1>
        {hasBirthInfo && (
          <p className="text-stone-500 text-sm">
            {person.date_of_birth && <>b.&nbsp;{person.date_of_birth}</>}
            {person.date_of_birth && person.place_of_birth && <>&ensp;·&ensp;</>}
            {person.place_of_birth && <>{person.place_of_birth}</>}
          </p>
        )}
      </div>

      {/* Body: image + biography */}
      {lifeImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lifeImageUrl}
          alt={fullName(person)}
          className="float-left mr-6 mb-4 rounded-lg"
          style={{ maxWidth: "260px", maxHeight: "340px", objectFit: "cover" }}
        />
      )}

      {person.biography && (
        <div className="prose prose-stone prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{person.biography}</ReactMarkdown>
        </div>
      )}

      {/* Clear float */}
      <div style={{ clear: "both" }} />
    </div>,
    document.body
  );
}
