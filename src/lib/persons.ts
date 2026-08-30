import type { Person } from "./types";
import { compareFuzzyDates } from "./fuzzy-date";

export type SortField = "family_name" | "date_of_birth" | "place_of_birth";
export type SortDir = "asc" | "desc";

/** Sort a list of persons by a field; empty/null values always sort last. */
export function sortPersons(people: Person[], field: SortField, dir: SortDir): Person[] {
  return [...people].sort((a, b) => {
    // Date fields are free-text fuzzy dates ("circa 2013", "2018-2019",
    // "15/06/1985") and must be compared chronologically, never lexically.
    if (field === "date_of_birth") {
      return compareFuzzyDates(a.date_of_birth, b.date_of_birth, dir);
    }
    const av = (a[field] ?? "") as string;
    const bv = (b[field] ?? "") as string;
    if (!av && bv) return 1;
    if (av && !bv) return -1;
    if (!av && !bv) return 0;
    const cmp = av.localeCompare(bv);
    return dir === "asc" ? cmp : -cmp;
  });
}

/** Filter persons by a search query across first, middle, and family name. */
export function filterPersons(people: Person[], query: string): Person[] {
  const q = query.toLowerCase();
  if (!q) return people;
  return people.filter(
    (p) =>
      p.first_name.toLowerCase().includes(q) ||
      p.family_name.toLowerCase().includes(q) ||
      (p.middle_name ?? "").toLowerCase().includes(q)
  );
}

/** Pagination helpers. */
export function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  return items.slice((safePage - 1) * pageSize, safePage * pageSize);
}
