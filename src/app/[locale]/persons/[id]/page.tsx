"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import { rawId } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useTree } from "@/contexts/TreeContext";
import type { Person, SpouseInfo, RelationshipsResponse, FamilyTreeNode } from "@/lib/types";
import { fullName } from "@/components/PersonCard";
import PersonAvatar from "@/components/PersonAvatar";
import ImageUpload from "@/components/ImageUpload";
import AddRelationshipModal from "@/components/AddRelationshipModal";

const FamilyTreeView = dynamic(() => import("@/components/FamilyTreeView"), { ssr: false });

const REL_TYPE_MAP: Record<string, string> = {
  father: "has_father",
  mother: "has_mother",
  siblings: "has_sibling",
  spouse: "has_spouse",
};

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { trees: allTrees } = useTree();
  const t = useTranslations("personDetail");

  const [person, setPerson] = useState<Person | null>(null);
  const [rels, setRels] = useState<RelationshipsResponse | null>(null);
  const [tree, setTree] = useState<FamilyTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddRel, setShowAddRel] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showLifeUpload, setShowLifeUpload] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"tree" | "relationships" | "lifestory">("tree");
  const [editingSpouseId, setEditingSpouseId] = useState<string | null>(null);
  const [spouseFromEdit, setSpouseFromEdit] = useState("");
  const [spouseToEdit, setSpouseToEdit] = useState("");
  const [savingSpouse, setSavingSpouse] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r, tr] = await Promise.all([api.getPerson(id), api.getRelationships(id), api.getFamilyTree(id)]);
      setPerson(p);
      setRels(r);
      setTree(tr);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deleteFailed"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function startEditSpouse(spouse: SpouseInfo) {
    setEditingSpouseId(spouse.id);
    setSpouseFromEdit(spouse.spouse_from ?? "");
    setSpouseToEdit(spouse.spouse_to ?? "");
  }

  async function saveSpouseDates(spouseId: string) {
    setSavingSpouse(true);
    try {
      await api.updateSpouseDates(id, spouseId, { spouse_from: spouseFromEdit || null, spouse_to: spouseToEdit || null });
      setEditingSpouseId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSavingSpouse(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("deleteConfirm", { name: person ? fullName(person) : t("notFound") }))) return;
    setDeleting(true);
    try {
      await api.deletePerson(id);
      router.push("/family");
    } catch (e) {
      alert(e instanceof Error ? e.message : t("deleteFailed"));
      setDeleting(false);
    }
  }

  async function handleDeleteRel(group: "father" | "mother" | "siblings" | "spouse", related: Person | SpouseInfo) {
    if (!confirm(t("removeConfirm", { name: fullName(related), group }))) return;
    await api.deleteRelationship(id, REL_TYPE_MAP[group], related.id);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-stone-400">
        <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🌳</div><p>{t("loading")}</p></div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 font-medium">{error ?? t("notFound")}</p>
        <Link href="/family" className="text-emerald-700 underline mt-4 inline-block">{t("back")}</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowUpload((v) => !v)} title={t("changePhoto")} className="relative group/avatar flex-shrink-0">
            <PersonAvatar person={person} size={72} className="ring-2 ring-stone-200" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-white text-xs font-medium opacity-0 group-hover/avatar:opacity-100 transition-opacity">
              {person.image_path ? t("changePhotoHover") : t("addPhoto")}
            </span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-stone-800">{fullName(person)}</h1>
            <p className="text-stone-500 mt-0.5 text-sm">
              {person.sex} · {person.date_of_birth ? t("bornPrefix", { date: person.date_of_birth }) : t("birthDateUnknown")}
              {person.date_of_death ? ` · ${t("diedPrefix", { date: person.date_of_death })}` : ""}
            </p>
            {(person.place_of_birth || person.place_of_death) && (
              <p className="text-stone-400 text-xs mt-0.5">
                {person.place_of_birth && t("fromPlace", { place: person.place_of_birth })}
                {person.place_of_death && ` · ${t("diedInPlace", { place: person.place_of_death })}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/persons/${id}/edit`} className="border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">{t("edit")}</Link>
          <button onClick={handleDelete} disabled={deleting} className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
            {deleting ? t("deleting") : t("delete")}
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="mb-6 bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-stone-700">{person.image_path ? t("replacePhoto") : t("addPhoto")}</p>
            <button onClick={() => setShowUpload(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>
          <ImageUpload personId={id} onUploaded={() => { setShowUpload(false); load(); }} />
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {(["tree", "relationships", "lifestory"] as const).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === tabKey ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-500 hover:text-stone-700"}`}>
            {tabKey === "tree" ? t("tabFamilyTree") : tabKey === "relationships" ? t("tabRelationships") : t("tabLifeStory")}
          </button>
        ))}
      </div>

      {tab === "tree" && tree && (
        <div>
          <FamilyTreeView tree={tree} />
          <p className="text-xs text-stone-400 mt-2 text-center">{t("treeHelpText")}</p>
        </div>
      )}

      {tab === "relationships" && rels && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setShowAddRel(true)} className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + {t("addRelationship")}
            </button>
          </div>
          {(["father", "mother", "siblings"] as const).map((group) => {
            const people = rels[group];
            return (
              <section key={group}>
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  {group === "father" ? t("sectionFather") : group === "mother" ? t("sectionMother") : t("sectionSiblings")}
                </h2>
                {people.length === 0 ? (<p className="text-stone-400 text-sm italic">{t("noneRecorded")}</p>) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {people.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 px-4 py-3 shadow-sm">
                        <Link href={`/persons/${rawId(p.id)}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                          <PersonAvatar person={p} size={36} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-stone-800 group-hover:text-emerald-700 truncate">{fullName(p)}</p>
                            {p.date_of_birth && <p className="text-xs text-stone-400">{t("bornPrefix", { date: p.date_of_birth })}</p>}
                          </div>
                        </Link>
                        <button onClick={() => handleDeleteRel(group, p)} className="text-stone-300 hover:text-red-500 transition-colors text-lg ml-2 flex-shrink-0" title={t("removeRelationship")}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          <section>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">{t("sectionSpouse")}</h2>
            {rels.spouse.length === 0 ? (<p className="text-stone-400 text-sm italic">{t("noneRecorded")}</p>) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rels.spouse.map((sp: SpouseInfo) => (
                  <div key={sp.id} className="bg-white rounded-xl border border-stone-200 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Link href={`/persons/${rawId(sp.id)}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                        <PersonAvatar person={sp} size={36} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-stone-800 group-hover:text-emerald-700 truncate">{fullName(sp)}</p>
                          {sp.date_of_birth && <p className="text-xs text-stone-400">{t("bornPrefix", { date: sp.date_of_birth })}</p>}
                        </div>
                      </Link>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => editingSpouseId === sp.id ? setEditingSpouseId(null) : startEditSpouse(sp)} className="text-stone-400 hover:text-emerald-600 transition-colors text-xs px-1" title={t("editDates")}>✏️</button>
                        <button onClick={() => handleDeleteRel("spouse", sp)} className="text-stone-300 hover:text-red-500 transition-colors text-lg" title={t("removeRelationship")}>×</button>
                      </div>
                    </div>
                    {(sp.spouse_from || sp.spouse_to) && editingSpouseId !== sp.id && (
                      <p className="text-xs text-violet-500 mt-1">
                        {sp.spouse_from && t("spouseFrom", { date: sp.spouse_from })}{sp.spouse_from && sp.spouse_to && " · "}{sp.spouse_to && t("spouseTo", { date: sp.spouse_to })}
                      </p>
                    )}
                    {editingSpouseId === sp.id && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-stone-500 block mb-0.5">{t("spouseFrom")}</label>
                            <input type="text" value={spouseFromEdit} onChange={(e) => setSpouseFromEdit(e.target.value)} placeholder={t("spouseFromPlaceholder")} className="w-full rounded border border-stone-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-500 block mb-0.5">{t("spouseTo")}</label>
                            <input type="text" value={spouseToEdit} onChange={(e) => setSpouseToEdit(e.target.value)} placeholder={t("spouseToPlaceholder")} className="w-full rounded border border-stone-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveSpouseDates(sp.id)} disabled={savingSpouse} className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded py-1 text-xs font-medium transition-colors">
                            {savingSpouse ? t("saving") : t("save")}
                          </button>
                          <button onClick={() => setEditingSpouseId(null)} className="flex-1 border border-stone-300 rounded py-1 text-xs text-stone-600 hover:bg-stone-50 transition-colors">{t("cancel")}</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "relationships" && person && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">{t("sectionTrees")}</h2>
          <div className="flex flex-wrap gap-2">
            {(person.trees ?? []).map((treeName) => {
              const isOnly = (person.trees ?? []).length === 1;
              return (
                <div key={treeName} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <span className="text-sm text-emerald-800 font-medium">{treeName}</span>
                  <button
                    disabled={isOnly}
                    title={isOnly ? t("cannotRemoveLastTree") : t("removeFromTree")}
                    onClick={async () => { await api.removePersonFromTree(id, treeName); load(); }}
                    className="text-emerald-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none ml-1"
                  >×</button>
                </div>
              );
            })}
            {allTrees
              .filter((tr) => !(person.trees ?? []).includes(tr.name))
              .map((tr) => (
                <button
                  key={tr.name}
                  onClick={async () => { await api.addPersonToTree(id, tr.name); load(); }}
                  className="text-sm border border-dashed border-stone-300 text-stone-500 hover:border-emerald-400 hover:text-emerald-700 rounded-lg px-3 py-1.5 transition-colors"
                >
                  + {tr.display_name}
                </button>
              ))}
          </div>
        </div>
      )}

      {tab === "lifestory" && (
        <div className="max-w-3xl space-y-4">
          {showLifeUpload && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-stone-700">{t("lifeImageSection")}</p>
                <button onClick={() => setShowLifeUpload(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
              </div>
              <ImageUpload
                personId={id}
                uploadFn={(file) => api.uploadPersonLifeImage(id, file)}
                onUploaded={() => { setShowLifeUpload(false); load(); }}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-6">
            {person.life_image_path && (
              <div className="shrink-0">
                <button
                  onClick={() => setShowLifeUpload((v) => !v)}
                  title={t("changeLifeImage")}
                  className="relative group/lifeimg block"
                >
                  <img
                    src={api.personLifeImageUrl(id)}
                    alt={t("lifeImageSection")}
                    className="rounded-xl object-cover w-full sm:w-48 md:w-64 max-h-80 sm:max-h-none"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 text-white text-xs font-medium opacity-0 group-hover/lifeimg:opacity-100 transition-opacity">
                    {t("changeLifeImage")}
                  </span>
                </button>
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-4">
              {person.biography ? (
                <div className="prose prose-stone prose-sm sm:prose-base max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{person.biography}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-stone-400 text-sm italic">
                  {t("lifeStoryEmpty")}{" "}
                  <Link href={`/persons/${id}/edit`} className="text-emerald-700 underline not-italic">{t("lifeStoryEmptyEdit")}</Link>
                </p>
              )}

              {!person.life_image_path && !showLifeUpload && (
                <button
                  onClick={() => setShowLifeUpload(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-emerald-700 border border-dashed border-stone-300 hover:border-emerald-400 rounded-lg px-3 py-1.5 transition-colors"
                >
                  + {t("addLifeImage")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddRel && (<AddRelationshipModal personId={id} onDone={() => { setShowAddRel(false); load(); }} onClose={() => setShowAddRel(false)} />)}
    </div>
  );
}
