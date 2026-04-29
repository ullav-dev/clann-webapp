"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { rawId } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Person } from "@/lib/types";
import { sortPersons, filterPersons, totalPages, pageSlice } from "@/lib/persons";
import type { SortField, SortDir } from "@/lib/persons";
import PersonCard from "@/components/PersonCard";
import PersonAvatar from "@/components/PersonAvatar";
import { fullName } from "@/components/PersonCard";
import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import { useTeam } from "@/contexts/TeamContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";

type ViewMode = "card" | "list";

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
  const api = useApi();
  const t = useTranslations("family");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(person: Person) {
    if (!confirm(t("deleteConfirm", { name: fullName(person) }))) return;
    setDeletingId(person.id);
    try {
      await api.deletePerson(person.id);
      onDeleted(person.id);
    } catch {
      alert(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const thCls = "px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide select-none";
  const sortableTh = (field: SortField, label: string) => (
    <th className={`${thCls} cursor-pointer hover:text-stone-800 transition-colors whitespace-nowrap`} onClick={() => onSort(field)}>
      {label}<SortIcon active={sortField === field} dir={sortDir} />
    </th>
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            <th className={thCls}>{t("colPerson")}</th>
            {sortableTh("family_name", t("colFamilyName"))}
            {sortableTh("date_of_birth", t("colDateOfBirth"))}
            {sortableTh("place_of_birth", t("colPlaceOfBirth"))}
            <th className={`${thCls} hidden sm:table-cell`}>{t("colSex")}</th>
            <th className={`${thCls} text-right`}></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {people.map((p) => (
            <tr key={p.id} className="hover:bg-stone-50 transition-colors group">
              <td className="px-4 py-3">
                <Link href={`/persons/${rawId(p.id)}`} className="flex items-center gap-3 group/link">
                  <PersonAvatar person={p} size={36} />
                  <span className="font-medium text-stone-800 group-hover/link:text-emerald-700 transition-colors">{fullName(p)}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-stone-600">{p.family_name}</td>
              <td className="px-4 py-3 text-stone-500">{p.date_of_birth ?? <span className="text-stone-300 italic">—</span>}</td>
              <td className="px-4 py-3 text-stone-500">{p.place_of_birth ?? <span className="text-stone-300 italic">—</span>}</td>
              <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">{p.sex}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => handleDelete(p)} disabled={deletingId === p.id} title={t("deletePersonTitle")}
                  className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                  {deletingId === p.id ? <span className="text-xs">…</span> : (
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

function CardIcon() { return (<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>); }
function ListIcon() { return (<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>); }

export default function FamilyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeTree, isLoading: treeLoading, initError } = useTree();
  const { isTeamTree } = useTeam();
  const { atMemberLimit } = useSubscription();
  const readOnly = !!activeTree && isTeamTree(activeTree.name);
  const api = useApi();
  const router = useRouter();
  const t = useTranslations("family");

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
    if (!user || treeLoading) return;
    if (!activeTree) { setLoading(false); return; }
    setLoading(true);
    setPersons([]);
    api.listPersons()
      .then(setPersons)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTree?.name, treeLoading]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const matched = filterPersons(persons, search);
    return view === "list" ? sortPersons(matched, sortField, sortDir) : matched;
  }, [persons, search, view, sortField, sortDir]);

  const numPages = totalPages(filtered.length, pageSize);
  const safePage = Math.min(page, numPages);
  const paged = pageSlice(filtered, safePage, pageSize);

  if (authLoading || treeLoading || !user) return null;

  if (!activeTree) {
    return (
      <div className="text-center py-20 text-stone-400">
        <div className="text-6xl mb-4">🌳</div>
        <p className="text-lg font-medium text-stone-600">{t("noTreeTitle")}</p>
        <p className="text-sm mt-1">{t("noTreeDescription")}</p>
      </div>
    );
  }

  return (
    <div>
      <ReadOnlyBanner />
      {initError && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm">
          {initError}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">{t("title")}</h1>
          <p className="text-stone-500 mt-1">
            {loading ? t("loading") : t("personCount", { count: persons.length })}
          </p>
        </div>
        {!readOnly && (
          atMemberLimit(persons.length) ? (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors self-start sm:self-auto text-sm"
            >
              ⚡ {t("memberLimitCta")}
            </Link>
          ) : (
            <Link href="/persons/new" className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors self-start sm:self-auto">
              <span>+</span> {t("addPerson")}
            </Link>
          )
        )}
      </div>

      {!loading && atMemberLimit(persons.length) && (
        <UpgradePrompt
          titleKey="memberLimitTitle"
          messageKey="memberLimitMessage"
          className="mb-6"
        />
      )}

      <div className="flex items-center gap-3 mb-6">
        {persons.length > 4 && (
          <input type="search" placeholder={t("searchPlaceholder")} value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 sm:flex-none sm:w-80 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        )}
        <div className="flex items-center gap-1.5 text-sm text-stone-600">
          <span className="hidden sm:inline whitespace-nowrap">{t("perPage")}</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
            {[5, 10, 15, 20, 25, 30].map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </div>
        <div className="ml-auto inline-flex rounded-lg border border-stone-300 bg-white shadow-sm overflow-hidden">
          <button onClick={() => setView("card")} title={t("cardView")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${view === "card" ? "bg-emerald-700 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
            <CardIcon /><span className="hidden sm:inline">{t("cards")}</span>
          </button>
          <button onClick={() => setView("list")} title={t("listView")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-stone-300 ${view === "list" ? "bg-emerald-700 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
            <ListIcon /><span className="hidden sm:inline">{t("list")}</span>
          </button>
        </div>
      </div>

      {error && (<div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm mb-6">{t("errorLoading", { error })}</div>)}

      {!loading && filtered.length === 0 && !error && (
        <div className="text-center py-20 text-stone-400">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-lg font-medium text-stone-600">{t("noPeopleYet")}</p>
          <p className="text-sm mt-1">{t("noPeopleDescription")}</p>
          <Link href="/persons/new" className="inline-block mt-6 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors">{t("addFirstPerson")}</Link>
        </div>
      )}

      {view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paged.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              onDeleted={readOnly ? undefined : (id) => setPersons((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      ) : (
        <ListView people={paged} sortField={sortField} sortDir={sortDir} onSort={handleSort}
          onDeleted={readOnly ? ((_id) => {}) : (id) => setPersons((prev) => prev.filter((x) => x.id !== id))} />
      )}

      {numPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
            className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{t("prev")}</button>
          {Array.from({ length: numPages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === numPages || Math.abs(n - safePage) <= 1)
            .reduce<(number | "…")[]>((acc, n, idx, arr) => {
              if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((item, idx) => item === "…" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-stone-400 text-sm">…</span>
            ) : (
              <button key={item} onClick={() => setPage(item as number)}
                className={`min-w-[2rem] px-3 py-1.5 rounded-lg border text-sm transition-colors ${safePage === item ? "bg-emerald-700 text-white border-emerald-700" : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"}`}>
                {item}
              </button>
            ))}
          <button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={safePage === numPages}
            className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{t("next")}</button>
        </div>
      )}
    </div>
  );
}
