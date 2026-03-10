"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  getPerson,
  getRelationships,
  getFamilyTree,
  deletePerson,
  deleteRelationship,
  rawId,
} from "@/lib/api";
import type { Person, RelationshipsResponse, FamilyTreeNode } from "@/lib/types";
import { fullName } from "@/components/PersonCard";
import PersonAvatar from "@/components/PersonAvatar";
import ImageUpload from "@/components/ImageUpload";
import AddRelationshipModal from "@/components/AddRelationshipModal";

// Client-only: React Flow uses browser APIs
const FamilyTreeView = dynamic(() => import("@/components/FamilyTreeView"), { ssr: false });

const REL_TYPE_MAP: Record<string, string> = {
  father: "has_father",
  mother: "has_mother",
  siblings: "has_sibling",
};

export default function PersonDetailPage() {
  // params.id is the raw ULID (no "person:" prefix) — URLs use rawId()
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [person, setPerson] = useState<Person | null>(null);
  const [rels, setRels] = useState<RelationshipsResponse | null>(null);
  const [tree, setTree] = useState<FamilyTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddRel, setShowAddRel] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"tree" | "relationships">("tree");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r, t] = await Promise.all([
        getPerson(id),
        getRelationships(id),
        getFamilyTree(id),
      ]);
      setPerson(p);
      setRels(r);
      setTree(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!confirm(`Delete ${person ? fullName(person) : "this person"}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deletePerson(id);
      router.push("/");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleDeleteRel(group: "father" | "mother" | "siblings", related: Person) {
    if (!confirm(`Remove ${fullName(related)} as ${group}?`)) return;
    await deleteRelationship(id, REL_TYPE_MAP[group], related.id);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-stone-400">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌳</div>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 font-medium">{error ?? "Person not found"}</p>
        <Link href="/" className="text-emerald-700 underline mt-4 inline-block">← Back</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowUpload((v) => !v)}
            title="Change photo"
            className="relative group/avatar flex-shrink-0"
          >
            <PersonAvatar person={person} size={72} className="ring-2 ring-stone-200" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-white text-xs font-medium opacity-0 group-hover/avatar:opacity-100 transition-opacity">
              {person.image_path ? "Change" : "Add photo"}
            </span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-stone-800">{fullName(person)}</h1>
            <p className="text-stone-500 mt-0.5 text-sm">
              {person.sex} ·{" "}
              {person.date_of_birth ? `b. ${person.date_of_birth}` : "Birth date unknown"}
              {person.date_of_death ? ` · d. ${person.date_of_death}` : ""}
            </p>
            {(person.place_of_birth || person.place_of_death) && (
              <p className="text-stone-400 text-xs mt-0.5">
                {person.place_of_birth && `From ${person.place_of_birth}`}
                {person.place_of_death && ` · Died in ${person.place_of_death}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/persons/${id}/edit`}
            className="border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Photo upload panel */}
      {showUpload && (
        <div className="mb-6 bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-stone-700">
              {person.image_path ? "Replace photo" : "Add photo"}
            </p>
            <button onClick={() => setShowUpload(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>
          <ImageUpload
            personId={id}
            onUploaded={() => { setShowUpload(false); load(); }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {(["tree", "relationships"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t === "tree" ? "🌳 Family Tree" : "👥 Relationships"}
          </button>
        ))}
      </div>

      {/* Family Tree tab */}
      {tab === "tree" && tree && (
        <div>
          <FamilyTreeView tree={tree} />
          <p className="text-xs text-stone-400 mt-2 text-center">
            Click any person to view their profile. Ancestors flow upward.
          </p>
        </div>
      )}

      {/* Relationships tab */}
      {tab === "relationships" && rels && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddRel(true)}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Relationship
            </button>
          </div>

          {["father", "mother", "siblings"].map((group) => {
            const people = rels[group as keyof RelationshipsResponse];
            return (
              <section key={group}>
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  {group === "father" ? "👨 Father" : group === "mother" ? "👩 Mother" : "👫 Siblings"}
                </h2>
                {people.length === 0 ? (
                  <p className="text-stone-400 text-sm italic">None recorded</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {people.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 px-4 py-3 shadow-sm"
                      >
                        <Link
                          href={`/persons/${rawId(p.id)}`}
                          className="flex items-center gap-3 flex-1 min-w-0 group"
                        >
                          <PersonAvatar person={p} size={36} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-stone-800 group-hover:text-emerald-700 truncate">
                              {fullName(p)}
                            </p>
                            {p.date_of_birth && (
                              <p className="text-xs text-stone-400">b. {p.date_of_birth}</p>
                            )}
                          </div>
                        </Link>
                        <button
                          onClick={() => handleDeleteRel(group as "father" | "mother" | "siblings", p)}
                          className="text-stone-300 hover:text-red-500 transition-colors text-lg ml-2 flex-shrink-0"
                          title="Remove relationship"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {showAddRel && (
        <AddRelationshipModal
          personId={id}
          onDone={() => { setShowAddRel(false); load(); }}
          onClose={() => setShowAddRel(false)}
        />
      )}
    </div>
  );
}
