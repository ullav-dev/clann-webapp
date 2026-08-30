import { describe, it, expect } from "vitest";
import { fuzzyDateSortKey, compareFuzzyDates } from "./fuzzy-date";

describe("fuzzyDateSortKey", () => {
  it("returns null for blank/unparseable input", () => {
    expect(fuzzyDateSortKey(null)).toBeNull();
    expect(fuzzyDateSortKey(undefined)).toBeNull();
    expect(fuzzyDateSortKey("")).toBeNull();
    expect(fuzzyDateSortKey("   ")).toBeNull();
    expect(fuzzyDateSortKey("unknown")).toBeNull();
  });

  it("parses ISO dates by month/day, not lexically", () => {
    // The classic regression: Nov must sort AFTER March in the same year.
    expect(fuzzyDateSortKey("2020-03-15")! < fuzzyDateSortKey("2020-11-02")!).toBe(true);
    expect(fuzzyDateSortKey("2020-03-15")).toBe(20200315);
    expect(fuzzyDateSortKey("2020-01-01")! < fuzzyDateSortKey("2020-01-02")!).toBe(true);
  });

  it("parses ISO year-month", () => {
    expect(fuzzyDateSortKey("2020-03")).toBe(20200300);
  });

  it("parses day-first slash dates", () => {
    expect(fuzzyDateSortKey("15/06/1985")).toBe(19850615);
    expect(fuzzyDateSortKey("06/1985")).toBe(19850600);
  });

  it("parses month names with and without a day", () => {
    expect(fuzzyDateSortKey("March 1990")).toBe(19900300);
    expect(fuzzyDateSortKey("15 March 1990")).toBe(19900315);
    expect(fuzzyDateSortKey("Mar 1990")).toBe(19900300);
  });

  it("handles approximate dates: 'circa 2013' sorts before '2014'", () => {
    expect(fuzzyDateSortKey("circa 2013")! < fuzzyDateSortKey("2014")!).toBe(true);
  });

  it("handles ranges by earliest bound: '2018-2019' sorts before '2019'", () => {
    expect(fuzzyDateSortKey("2018-2019")! < fuzzyDateSortKey("2019")!).toBe(true);
    expect(fuzzyDateSortKey("2018-2019")).toBe(20180000);
  });

  it("orders a bare year before any dated day in that year", () => {
    expect(fuzzyDateSortKey("1990")! < fuzzyDateSortKey("1990-01-01")!).toBe(true);
  });
});

describe("compareFuzzyDates", () => {
  it("orders ascending chronologically", () => {
    const arr = ["2020-11-02", "circa 2013", "2018-2019", "2020-03-15"];
    const sorted = [...arr].sort((a, b) => compareFuzzyDates(a, b, "asc"));
    expect(sorted).toEqual(["circa 2013", "2018-2019", "2020-03-15", "2020-11-02"]);
  });

  it("pushes unknown values last in both directions", () => {
    expect(compareFuzzyDates(null, "2000")).toBe(1);
    expect(compareFuzzyDates("2000", null)).toBe(-1);
    expect(compareFuzzyDates(null, "2000", "desc")).toBe(1);
    expect(compareFuzzyDates("2000", null, "desc")).toBe(-1);
    expect(compareFuzzyDates(null, null)).toBe(0);
  });
});
