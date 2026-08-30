/**
 * Fuzzy date parsing for the free-text date fields used throughout the app
 * (`date_of_birth`, `date_of_death`, life-event `date`, …).
 *
 * These fields are never guaranteed to be well-formed dates: users type things
 * like "circa 2013", "2018-2019", "March 1990", "15/06/1985" or "2020-03-15".
 * They MUST NOT be compared lexicographically — "circa 2013" would then sort
 * after "2014", and "2020-11-02" would sort before "2020-03-15".
 *
 * `fuzzyDateSortKey` turns such a string into a single numeric key
 * (`year*10000 + month*100 + day`) so a plain numeric subtraction orders them
 * chronologically. Unknown month/day components are treated as 0 so a bare year
 * sorts just before any dated day in that year. When no year can be found the
 * key is `null` (callers decide where unparseable/blank values go — typically
 * last, in both sort directions).
 *
 * For ranges ("2018-2019") and approximations ("circa 2013") the *earliest*
 * bound is used, which is the natural reading and satisfies both of the classic
 * cases: "2018-2019" < "2019" and "circa 2013" < "2014".
 */

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Build the numeric key; month/day of 0 mean "unknown". */
function key(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

/**
 * Parse a free-text date into a comparable numeric key, or `null` when no year
 * can be identified. Higher key = later date.
 */
export function fuzzyDateSortKey(date: string | null | undefined): number | null {
  if (!date) return null;
  const s = date.trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  // 1. ISO date: YYYY-MM-DD (month 1-12, day 1-31). Ordered first so a full
  //    numeric date never falls through to the bare-year path.
  const iso = s.match(/\b(\d{4})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return key(+iso[1], +iso[2], +iso[3]);

  // 2. ISO year-month: YYYY-MM. Won't match a YYYY-YYYY range (month > 12).
  const isoYm = s.match(/\b(\d{4})-(0?[1-9]|1[0-2])\b/);
  if (isoYm) return key(+isoYm[1], +isoYm[2], 0);

  // 3. Slash dates: DD/MM/YYYY (or D/M/YYYY). Assumes day-first (UK/IE).
  const dmy = s.match(/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(\d{4})\b/);
  if (dmy) return key(+dmy[3], +dmy[2], +dmy[1]);

  // 4. Slash month-year: MM/YYYY.
  const my = s.match(/\b(0?[1-9]|1[0-2])\/(\d{4})\b/);
  if (my) return key(+my[2], +my[1], 0);

  // 5. Month name (full or 3-letter abbrev) somewhere in the string.
  const monthIdx = MONTH_NAMES.findIndex((m) => lower.includes(m.slice(0, 3)));
  const yearMatch = s.match(/\d{4}/);
  if (monthIdx >= 0 && yearMatch) {
    const year = +yearMatch[0];
    // Look for a 1-2 digit day, ignoring the 4-digit year token.
    const withoutYear = s.replace(yearMatch[0], " ");
    const dayMatch = withoutYear.match(/\b(0?[1-9]|[12]\d|3[01])\b/);
    return key(year, monthIdx + 1, dayMatch ? +dayMatch[1] : 0);
  }

  // 6. Fall back to the first 4-digit year found (covers "circa 2013",
  //    "2018-2019" → 2018, "born 1990", etc.).
  if (yearMatch) return key(+yearMatch[0], 0, 0);

  return null;
}

/**
 * Comparator for two fuzzy dates. Blank/unparseable values sort *last*
 * regardless of `dir` (matches the "empty last" convention used across the
 * person and event lists).
 */
export function compareFuzzyDates(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: "asc" | "desc" = "asc",
): number {
  const ka = fuzzyDateSortKey(a);
  const kb = fuzzyDateSortKey(b);
  if (ka === null && kb === null) return 0;
  if (ka === null) return 1; // a unknown → after b
  if (kb === null) return -1; // b unknown → after a
  const cmp = ka - kb;
  return dir === "asc" ? cmp : -cmp;
}
