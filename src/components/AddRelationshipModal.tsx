"use client";

import { useState, useEffect } from "react";
import type { Person, RelationshipType, SiblingType } from "@/lib/types";
import { listPersons, addRelationship, getRelationships } from "@/lib/api";
import { fullName, personIcon } from "./PersonCard";

interface Props {
  personId: string;
  onDone: () => void;
  onClose: () => void;
}

export default function AddRelationshipModal({ personId, onDone, onClose }: Props) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [relType, setRelType] = useState<RelationshipType>("Father");
  const [siblingType, setSiblingType] = useState<SiblingType>("Brother");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listPersons().then((all) =>
      setPersons(all.filter((p) => p.id !== personId))
    );
  }, [personId]);

  const filtered = persons.filter((p) =>
    fullName(p).toLowerCase().includes(search.toLowerCase())
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return setError("Please select a person");
    setError(null);
    setLoading(true);
    try {
      await addRelationship(personId, {
        type: relType,
        related_id: selectedId,
        sibling_type: relType === "Sibling" ? siblingType : null,
      });

      // When adding a sibling, propagate the root person's parents to the
      // sibling if the sibling doesn't already have them.
      if (relType === "Sibling") {
        const [rootRels, siblingRels] = await Promise.all([
          getRelationships(personId),
          getRelationships(selectedId),
        ]);

        const inheritParent = async (
          type: "Father" | "Mother",
          rootParents: { id: string }[],
          siblingParents: { id: string }[],
        ) => {
          const siblingParentIds = new Set(siblingParents.map((p) => p.id));
          for (const parent of rootParents) {
            if (!siblingParentIds.has(parent.id)) {
              await addRelationship(selectedId, { type, related_id: parent.id });
            }
          }
        };

        await inheritParent("Father", rootRels.father, siblingRels.father);
        await inheritParent("Mother", rootRels.mother, siblingRels.mother);
      }

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="font-semibold text-stone-800">Add Relationship</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Relationship type */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">Relationship Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Father", "Mother", "Sibling"] as RelationshipType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRelType(t)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    relType === t
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "border-stone-300 text-stone-700 hover:border-emerald-400"
                  }`}
                >
                  {t === "Father" ? "👨 Father" : t === "Mother" ? "👩 Mother" : "👫 Sibling"}
                </button>
              ))}
            </div>
          </div>

          {/* Sibling type */}
          {relType === "Sibling" && (
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">Sibling Type</label>
              <div className="flex gap-2">
                {(["Brother", "Sister"] as SiblingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSiblingType(t)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      siblingType === t
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "border-stone-300 text-stone-700 hover:border-emerald-400"
                    }`}
                  >
                    {t === "Brother" ? "👦 Brother" : "👧 Sister"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Person search */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">Select Person</label>
            <input
              type="search"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-stone-200 p-1">
              {filtered.length === 0 && (
                <p className="text-stone-400 text-sm text-center py-4">No people found</p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedId === p.id
                      ? "bg-emerald-700 text-white"
                      : "hover:bg-stone-100 text-stone-700"
                  }`}
                >
                  <span>{personIcon(p.sex)}</span>
                  <span>{fullName(p)}</span>
                  {p.date_of_birth && (
                    <span className={`ml-auto text-xs ${selectedId === p.id ? "text-emerald-200" : "text-stone-400"}`}>
                      b. {p.date_of_birth}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-stone-300 rounded-lg py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedId}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? "Adding…" : "Add Relationship"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
