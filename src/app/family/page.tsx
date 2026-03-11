"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listPersons, deletePerson, rawId } from "@/lib/api";
import type { Person } from "@/lib/types";
import PersonCard from "@/components/PersonCard";
import PersonAvatar from "@/components/PersonAvatar";
import { fullName } from "@/components/PersonCard";
import { useAuth } from "@/contexts/AuthContext";

type ViewMode = "card" | "list";
type SortField = "family_name" | "date_of_birth" | "place_of_birth";
type SortDir = "asc" | "desc";

function sortPersons(people: Person[], field: SortField, dir: SortDir): Person[] {
  return [...people].sort((a, b) => {
    const av = (a[field] ?? "") as string;
    const bv = (b[field] ?? "") as string;
    // Empty values always sort to the end
    if (!av && bv) return 1;
    if (av && !bv) return -1;
    if (!av && !bv) return 0;
    const cmp = av.localeCompare(bv);
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── List view ─────────────────────────────────────────────────────────────────

interface ListViewProps {
  people: Person[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onDeleted: (id: string) => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-stone-300 ml-1">↕</span>;
  return <span className="text-emerald-600 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

function ListView({ people, sortField, sortDir, onSort, onDeleted }: ListViewProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(person: Person) {
    if (!confirm(`Delete ${fullName(person)}? This cannot be undone.`)) return;
    setDeletingId(person.id);
    try {
      await deletePerson(person.id);
      onDeleted(person.id);
    } catch {
      alert("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const thCls = "px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide select-none";
  const sortableTh = (field: SortField, label: string) => (
    <th
      className={`${thCls} cursor-pointer hover:text-stone-800 transition-colors whitespace-nowrap`}
      onClick={() => onSort(field)}
    >
      {label}
      <SortIcon active={sortField === field} dir={sortDir} />
    </th>
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            <th className={thCls}>Person</th>
            {sortableTh("family_name", "Family Name")}
            {sortableTh("date_of_birth", "Date of Birth")}
            {sortableTh("place_of_birth", "Place of Birth")}
            <th className={`${thCls} hidden sm:table-cell`}>Sex</th>
            <th className={`${thCls} text-right`}></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {people.map((p) => (
            <tr key={p.id} className="hover:bg-stone-50 transition-colors group">
              <td className="px-4 py-3">
                <Link
                  href={`/persons/${rawId(p.id)}`}
                  className="flex items-center gap-3 group/link"
                >
                  <PersonAvatar person={p} size={36} />
                  <span className="font-medium text-stone-800 group-hover/link:text-emerald-700 transition-colors">
                    {fullName(p)}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-stone-600">{p.family_name}</td>
              <td className="px-4 py-3 text-stone-500">
                {p.date_of_birth ?? <span className="text-stone-300 italic">—</span>}
              </td>
              <td className="px-4 py-3 text-stone-500">
                {p.place_of_birth ?? <span className="text-stone-300 italic">—</span>}
              </td>
              <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">{p.sex}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(p)}
                  disabled={deletingId === p.id}
                  title="Delete person"
                  className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                >
                  {deletingId === p.id ? (
                    <span className="text-xs">…</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── View toggle icons ─────────────────────────────────────────────────────────

function CardIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("card");
  const [sortField, setSortField] = useState<SortField>("family_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  if (authLoading || !user) return null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const matched = persons.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.family_name.toLowerCase().includes(q) ||
        (p.middle_name ?? "").toLowerCase().includes(q)
    );
    return view === "list" ? sortPersons(matched, sortField, sortDir) : matched;
  }, [persons, search, view, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

      {/* Toolbar: search + page size + view toggle */}
      <div className="flex items-center gap-3 mb-6">
        {persons.length > 4 && (
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 sm:flex-none sm:w-80 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        )}

        {/* Page size selector */}
        <div className="flex items-center gap-1.5 text-sm text-stone-600">
          <span className="hidden sm:inline whitespace-nowrap">Per page</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {[5, 10, 15, 20, 25, 30].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="ml-auto inline-flex rounded-lg border border-stone-300 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setView("card")}
            title="Card view"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              view === "card"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <CardIcon />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            onClick={() => setView("list")}
            title="List view"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-stone-300 ${
              view === "list"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <ListIcon />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

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

      {view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paged.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              onDeleted={(id) => setPersons((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      ) : (
        <ListView
          people={paged}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          onDeleted={(id) => setPersons((prev) => prev.filter((x) => x.id !== id))}
        />
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
            .reduce<(number | "…")[]>((acc, n, idx, arr) => {
              if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "…" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-stone-400 text-sm">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`min-w-[2rem] px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    safePage === item
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
