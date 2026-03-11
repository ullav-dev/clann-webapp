"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PersonForm from "@/components/PersonForm";
import { createPerson } from "@/lib/api";
import type { CreatePerson } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function NewPersonPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  async function handleSubmit(values: CreatePerson) {
    const person = await createPerson(values);
    router.push(`/persons/${encodeURIComponent(person.id)}`);
  }

  if (isLoading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Add Person</h1>
        <p className="text-stone-500 mt-1">Create a new family member record.</p>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <PersonForm onSubmit={handleSubmit} submitLabel="Create Person" />
      </div>
    </div>
  );
}
