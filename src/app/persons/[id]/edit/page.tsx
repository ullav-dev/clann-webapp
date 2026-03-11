"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPerson, updatePerson } from "@/lib/api";
import type { Person, UpdatePerson } from "@/lib/types";
import PersonForm from "@/components/PersonForm";
import { fullName } from "@/components/PersonCard";

export default function EditPersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerson(id).then(setPerson).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(values: UpdatePerson) {
    await updatePerson(id, values);
    router.push(`/persons/${id}`);
  }

  if (loading) return <div className="py-20 text-center text-stone-400">Loading…</div>;
  if (!person) return <div className="py-20 text-center text-red-600">Person not found</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/persons/${id}`}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          ← Back to {fullName(person)}
        </Link>
        <h1 className="text-3xl font-bold text-stone-800 mt-2">Edit Person</h1>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <PersonForm
          initial={{
            first_name: person.first_name,
            middle_name: person.middle_name ?? "",
            family_name: person.family_name,
            sex: person.sex,
            date_of_birth: person.date_of_birth ?? "",
            date_of_death: person.date_of_death ?? "",
            place_of_birth: person.place_of_birth ?? "",
            place_of_death: person.place_of_death ?? "",
            nickname: person.nickname ?? "",
            username: person.username ?? "",
            email: person.email ?? "",
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
