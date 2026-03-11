import { describe, it, expect } from "vitest";
import { sortPersons, filterPersons, totalPages, pageSlice } from "./persons";
import type { Person } from "./types";

function p(
  id: string,
  first_name: string,
  family_name: string,
  overrides: Partial<Person> = {}
): Person {
  return { id, first_name, family_name, sex: "Male", ...overrides };
}

// ── sortPersons ──────────────────────────────────────────────────────────────

describe("sortPersons", () => {
  const people = [
    p("1", "Alice", "Zebra"),
    p("2", "Bob", "Apple"),
    p("3", "Carol", "Mango"),
  ];

  it("sorts by family_name asc", () => {
    const result = sortPersons(people, "family_name", "asc");
    expect(result.map((x) => x.family_name)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("sorts by family_name desc", () => {
    const result = sortPersons(people, "family_name", "desc");
    expect(result.map((x) => x.family_name)).toEqual(["Zebra", "Mango", "Apple"]);
  });

  it("sorts by date_of_birth asc", () => {
    const dated = [
      p("1", "A", "A", { date_of_birth: "1990-01-01" }),
      p("2", "B", "B", { date_of_birth: "1985-06-15" }),
      p("3", "C", "C", { date_of_birth: "2000-12-31" }),
    ];
    const result = sortPersons(dated, "date_of_birth", "asc");
    expect(result.map((x) => x.date_of_birth)).toEqual([
      "1985-06-15",
      "1990-01-01",
      "2000-12-31",
    ]);
  });

  it("pushes null/empty values to the end regardless of direction", () => {
    const mixed = [
      p("1", "A", "Smith", { place_of_birth: null }),
      p("2", "B", "Jones", { place_of_birth: "London" }),
    ];
    const asc = sortPersons(mixed, "place_of_birth", "asc");
    expect(asc[asc.length - 1].id).toBe("1");

    const desc = sortPersons(mixed, "place_of_birth", "desc");
    expect(desc[desc.length - 1].id).toBe("1");
  });

  it("does not mutate the original array", () => {
    const original = [p("1", "Z", "Z"), p("2", "A", "A")];
    sortPersons(original, "family_name", "asc");
    expect(original[0].first_name).toBe("Z");
  });
});

// ── filterPersons ────────────────────────────────────────────────────────────

describe("filterPersons", () => {
  const people = [
    p("1", "Alice", "Smith"),
    p("2", "Bob", "Jones"),
    p("3", "Carol", "Smith", { middle_name: "Marie" }),
  ];

  it("returns all when query is empty", () => {
    expect(filterPersons(people, "")).toHaveLength(3);
  });

  it("matches first_name case-insensitively", () => {
    expect(filterPersons(people, "alice")).toHaveLength(1);
    expect(filterPersons(people, "ALICE")).toHaveLength(1);
  });

  it("matches family_name", () => {
    expect(filterPersons(people, "smith")).toHaveLength(2);
  });

  it("matches middle_name", () => {
    expect(filterPersons(people, "marie")).toHaveLength(1);
  });

  it("returns empty when nothing matches", () => {
    expect(filterPersons(people, "zzz")).toHaveLength(0);
  });
});

// ── totalPages ───────────────────────────────────────────────────────────────

describe("totalPages", () => {
  it("returns 1 for empty list", () => {
    expect(totalPages(0, 10)).toBe(1);
  });

  it("returns 1 when items fit on one page", () => {
    expect(totalPages(5, 10)).toBe(1);
    expect(totalPages(10, 10)).toBe(1);
  });

  it("returns correct count when items overflow", () => {
    expect(totalPages(11, 10)).toBe(2);
    expect(totalPages(25, 10)).toBe(3);
    expect(totalPages(30, 10)).toBe(3);
    expect(totalPages(31, 10)).toBe(4);
  });

  it("works with non-default page sizes", () => {
    expect(totalPages(12, 5)).toBe(3);
    expect(totalPages(15, 5)).toBe(3);
    expect(totalPages(16, 5)).toBe(4);
  });
});

// ── pageSlice ────────────────────────────────────────────────────────────────

describe("pageSlice", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it("returns first pageSize items on page 1", () => {
    expect(pageSlice(items, 1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns correct slice on page 2", () => {
    expect(pageSlice(items, 2, 5)).toEqual([6, 7, 8, 9, 10]);
  });

  it("returns remaining items on the last page", () => {
    expect(pageSlice(items, 3, 5)).toEqual([11, 12]);
  });

  it("returns empty array when page is beyond content", () => {
    expect(pageSlice(items, 99, 10)).toEqual([]);
  });

  it("handles page size larger than the list", () => {
    expect(pageSlice([1, 2], 1, 100)).toEqual([1, 2]);
  });
});
