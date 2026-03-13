"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Person } from "@/lib/types";
import { rawId } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import PersonAvatar from "./PersonAvatar";

interface Props {
  person: Person;
  onDeleted?: (id: string) => void;
}

export function personIcon(sex: Person["sex"]) {
  return sex === "Female" ? "👩" : "👨";
}

export function fullName(p: { first_name: string; middle_name?: string | null; family_name: string }) {
  return [p.first_name, p.middle_name, p.family_name].filter(Boolean).join(" ");
}

export default function PersonCard({ person, onDeleted }: Props) {
  const api = useApi();
  const t = useTranslations("family");
  const tPerson = useTranslations("personDetail");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(t("deleteConfirm", { name: fullName(person) }))) return;
    setDeleting(true);
    try {
      await api.deletePerson(person.id);
      onDeleted?.(person.id);
    } catch {
      alert(t("deleteFailed"));
      setDeleting(false);
    }
  }

  return (
    <div className="group relative rounded-xl border border-stone-200 bg-white shadow-sm hover:shadow-md hover:border-emerald-300 transition-all">
      <Link
        href={`/persons/${rawId(person.id)}`}
        className="flex items-center gap-3 p-4 pr-12"
      >
        <PersonAvatar person={person} size={44} />
        <div className="min-w-0">
          <p className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors truncate">
            {fullName(person)}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {person.date_of_birth ? tPerson("bornPrefix", { date: person.date_of_birth }) : tPerson("birthDateUnknown")}
            {person.date_of_death ? ` · ${tPerson("diedPrefix", { date: person.date_of_death })}` : ""}
          </p>
        </div>
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        title={t("deletePersonTitle")}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
      >
        {deleting ? (
          <span className="text-xs">…</span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}
