"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listPersons } from "@/lib/api";
import type { Person } from "@/lib/types";
import PersonCard from "@/components/PersonCard";
import { useAuth } from "@/contexts/AuthContext";

export default function FamilyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    listPersons()
      .then(setPersons)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) return null;

  const filtered = persons.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.family_name.toLowerCase().includes(q) ||
      (p.middle_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Family Members</h1>
          <p className="text-stone-500 mt-1">
            {loading ? "Loading…" : `${persons.length} person${persons.length !== 1 ? "s" : ""} in your tree`}
          </p>
        </div>
        <Link
          href="/persons/new"
          className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors self-start sm:self-auto"
        >
          <span>+</span> Add Person
        </Link>
      </div>

      {persons.length > 4 && (
        <div className="mb-6">
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm mb-6">
          Could not load persons: {error}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="text-center py-20 text-stone-400">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-lg font-medium text-stone-600">No people yet</p>
          <p className="text-sm mt-1">Start building your family tree by adding the first person.</p>
          <Link
            href="/persons/new"
            className="inline-block mt-6 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Add First Person
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <PersonCard
            key={p.id}
            person={p}
            onDeleted={(id) => setPersons((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
