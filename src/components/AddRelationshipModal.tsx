"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Person, Pedigree, RelationshipType, SiblingType } from "@/lib/types";
import { useApi } from "@/hooks/useApi";
import { fullName, personIcon } from "./PersonCard";

interface Props {
  personId: string;
  onDone: () => void;
  onClose: () => void;
}

export default function AddRelationshipModal({ personId, onDone, onClose }: Props) {
  const api = useApi();
  const t = useTranslations("addRelationship");
  const [persons, setPersons] = useState<Person[]>([]);
  const [relType, setRelType] = useState<RelationshipType>("Father");
  const [siblingType, setSiblingType] = useState<SiblingType>("Brother");
  const [pedigree, setPedigree] = useState<Pedigree>("birth");
  const [spouseFrom, setSpouseFrom] = useState("");
  const [spouseTo, setSpouseTo] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listPersons().then((all) =>
      setPersons(all.filter((p) => api.rawId(p.id) !== personId))
    );
  }, [personId]);

  useEffect(() => {
    if (selectedId) {
      const selected = persons.find((p) => p.id === selectedId);
      const requiredSex =
        relType === "Father" ? "Male" :
        relType === "Mother" ? "Female" :
        relType === "Sibling" ? (siblingType === "Brother" ? "Male" : "Female") :
        null;
      if (selected && requiredSex && selected.sex !== requiredSex) setSelectedId("");
    }
    if (selectedIds.size > 0) {
      const requiredSex =
        relType === "Sibling" ? (siblingType === "Brother" ? "Male" : "Female") : null;
      if (requiredSex) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of prev) {
            const p = persons.find((p) => p.id === id);
            if (p && p.sex !== requiredSex) next.delete(id);
          }
          return next;
        });
      }
    }
  }, [relType, siblingType]);

  const filtered = persons.filter((p) => {
    if (relType === "Father" && p.sex !== "Male") return false;
    if (relType === "Mother" && p.sex !== "Female") return false;
    if (relType === "Sibling") {
      const requiredSex = siblingType === "Brother" ? "Male" : "Female";
      if (p.sex !== requiredSex) return false;
    }
    return fullName(p).toLowerCase().includes(search.toLowerCase());
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (relType === "Sibling") {
      if (selectedIds.size === 0) return setError(t("pleaseSelectPerson"));
    } else {
      if (!selectedId) return setError(t("pleaseSelectPerson"));
    }
    setError(null);
    setLoading(true);
    try {
      if (relType === "Sibling") {
        const rootRels = await api.getRelationships(personId);

        for (const sibId of selectedIds) {
          await api.addRelationship(personId, {
            type: "Sibling",
            related_id: sibId,
            sibling_type: siblingType,
          });

          const siblingRels = await api.getRelationships(sibId);

          const inheritParent = async (
            type: "Father" | "Mother",
            rootParents: { id: string }[],
            siblingParents: { id: string }[],
          ) => {
            const siblingParentIds = new Set(siblingParents.map((p) => p.id));
            for (const parent of rootParents) {
              if (!siblingParentIds.has(parent.id)) {
                await api.addRelationship(sibId, { type, related_id: parent.id });
              }
            }
          };

          await inheritParent("Father", rootRels.father, siblingRels.father);
          await inheritParent("Mother", rootRels.mother, siblingRels.mother);
        }
      } else {
        await api.addRelationship(personId, {
          type: relType,
          related_id: selectedId,
          spouse_from: relType === "Spouse" && spouseFrom ? spouseFrom : undefined,
          spouse_to: relType === "Spouse" && spouseTo ? spouseTo : undefined,
          pedigree: (relType === "Father" || relType === "Mother") ? pedigree : undefined,
        });

        // When adding a Father or Mother, find the parent's other children and
        // set them as siblings of the current person.
        if (relType === "Father" || relType === "Mother") {
          const [parentTree, myRels] = await Promise.all([
            api.getFamilyTree(selectedId),
            api.getRelationships(personId),
          ]);
          const existingSiblingIds = new Set(myRels.siblings.map((s) => api.rawId(s.id)));
          for (const child of parentTree.children ?? []) {
            if (api.rawId(child.id) === personId) continue;
            if (existingSiblingIds.has(api.rawId(child.id))) continue;
            const siblingType: SiblingType = child.sex === "Female" ? "Sister" : "Brother";
            await api.addRelationship(personId, {
              type: "Sibling",
              related_id: child.id,
              sibling_type: siblingType,
            });
          }
        }
      }

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="font-semibold text-stone-800">{t("title")}</h2>
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
            <label className="text-sm font-medium text-stone-700 block mb-2">{t("relationshipType")}</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Father", "Mother", "Sibling", "Spouse"] as RelationshipType[]).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setRelType(rt)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    relType === rt
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "border-stone-300 text-stone-700 hover:border-emerald-400"
                  }`}
                >
                  {rt === "Father" ? t("father") : rt === "Mother" ? t("mother") : rt === "Sibling" ? t("sibling") : t("spouse")}
                </button>
              ))}
            </div>
          </div>

          {/* Sibling type */}
          {relType === "Sibling" && (
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">{t("siblingType")}</label>
              <div className="flex gap-2">
                {(["Brother", "Sister"] as SiblingType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSiblingType(st)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      siblingType === st
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "border-stone-300 text-stone-700 hover:border-emerald-400"
                    }`}
                  >
                    {st === "Brother" ? t("brother") : t("sister")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pedigree selector — only for Father / Mother */}
          {(relType === "Father" || relType === "Mother") && (
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">{t("pedigree")}</label>
              <div className="grid grid-cols-2 gap-2">
                {(["birth", "adopted", "step", "foster"] as Pedigree[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPedigree(p)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      pedigree === p
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "border-stone-300 text-stone-700 hover:border-emerald-400"
                    }`}
                  >
                    {t(`pedigree_${p}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Spouse dates */}
          {relType === "Spouse" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">{t("spouseFrom")}</label>
                <input
                  type="text"
                  placeholder={t("spouseFromPlaceholder")}
                  value={spouseFrom}
                  onChange={(e) => setSpouseFrom(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">{t("spouseTo")}</label>
                <input
                  type="text"
                  placeholder={t("spouseToPlaceholder")}
                  value={spouseTo}
                  onChange={(e) => setSpouseTo(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Person search */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">{t("selectPerson")}</label>
            <input
              type="search"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-stone-200 p-1">
              {filtered.length === 0 && (
                <p className="text-stone-400 text-sm text-center py-4">{t("noPeopleFound")}</p>
              )}
              {filtered.map((p) => {
                const isSelected = relType === "Sibling" ? selectedIds.has(p.id) : selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (relType === "Sibling") {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                          return next;
                        });
                      } else {
                        setSelectedId(p.id);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      isSelected
                        ? "bg-emerald-700 text-white"
                        : "hover:bg-stone-100 text-stone-700"
                    }`}
                  >
                    <span>{personIcon(p.sex)}</span>
                    <span>{fullName(p)}</span>
                    {p.date_of_birth && (
                      <span className={`ml-auto text-xs ${isSelected ? "text-emerald-200" : "text-stone-400"}`}>
                        {t("bornPrefix", { date: p.date_of_birth })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-stone-300 rounded-lg py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || (relType === "Sibling" ? selectedIds.size === 0 : !selectedId)}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? t("adding") : t("addRelationship")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
