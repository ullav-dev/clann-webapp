import { describe, it, expect } from "vitest";
import { slugify, parseTreeExport } from "./tree-import";

// ── slugify ───────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Smith Family")).toBe("smith-family");
  });

  it("strips diacritics", () => {
    expect(slugify("Ó Briain")).toBe("o-briain");
    expect(slugify("Séan Néill")).toBe("sean-neill");
  });

  it("collapses consecutive non-alphanumeric chars into one hyphen", () => {
    expect(slugify("a  b--c")).toBe("a-b-c");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});

// ── parseTreeExport — error cases ─────────────────────────────────────────────

describe("parseTreeExport error cases", () => {
  it("throws when input is null", () => {
    expect(() => parseTreeExport(null)).toThrow("expected a JSON object");
  });

  it("throws when input is a string", () => {
    expect(() => parseTreeExport("not-an-object")).toThrow("expected a JSON object");
  });

  it("throws when neither persons nor root field is present", () => {
    expect(() => parseTreeExport({})).toThrow("missing 'persons' or 'root'");
  });

  it("throws when root field is present but not an object", () => {
    expect(() => parseTreeExport({ root: null })).toThrow("missing 'persons' or 'root'");
  });
});

// ── parseTreeExport — flat format ─────────────────────────────────────────────

describe("parseTreeExport flat format", () => {
  const basePerson = {
    id: "p1",
    first_name: "Seán",
    family_name: "Murphy",
    sex: "Male",
  };

  it("maps persons to ImportPerson with originalId", () => {
    const result = parseTreeExport({
      tree_name: "my-tree",
      tree_display_name: "My Tree",
      persons: [basePerson],
      relationships: [],
    });
    expect(result.persons).toHaveLength(1);
    expect(result.persons[0].originalId).toBe("p1");
    expect(result.persons[0].first_name).toBe("Seán");
    expect(result.persons[0].family_name).toBe("Murphy");
    expect(result.persons[0].sex).toBe("Male");
  });

  it("extracts suggestedName and suggestedDisplayName from tree fields", () => {
    const result = parseTreeExport({
      tree_name: "smith-family",
      tree_display_name: "Smith Family",
      persons: [],
      relationships: [],
    });
    expect(result.suggestedName).toBe("smith-family");
    expect(result.suggestedDisplayName).toBe("Smith Family");
  });

  it("defaults suggestedName and suggestedDisplayName to empty string when absent", () => {
    const result = parseTreeExport({ persons: [], relationships: [] });
    expect(result.suggestedName).toBe("");
    expect(result.suggestedDisplayName).toBe("");
  });

  it("defaults relationships to empty array when field is absent", () => {
    const result = parseTreeExport({ persons: [basePerson] });
    expect(result.relationships).toEqual([]);
  });

  it("maps optional person fields (dates, places, biography)", () => {
    const p = {
      ...basePerson,
      date_of_birth: "1 JAN 1980",
      place_of_birth: "Dublin",
      date_of_death: "1 JAN 2060",
      place_of_death: "Cork",
      biography: "A life well lived.",
    };
    const { persons } = parseTreeExport({ persons: [p], relationships: [] });
    expect(persons[0].date_of_birth).toBe("1 JAN 1980");
    expect(persons[0].place_of_birth).toBe("Dublin");
    expect(persons[0].date_of_death).toBe("1 JAN 2060");
    expect(persons[0].place_of_death).toBe("Cork");
    expect(persons[0].biography).toBe("A life well lived.");
  });

  it("skips relationships with unknown type", () => {
    const result = parseTreeExport({
      persons: [basePerson],
      relationships: [{ person_id: "p1", related_id: "p2", type: "Enemy" }],
    });
    expect(result.relationships).toHaveLength(0);
  });

  it("skips relationships with empty personId or relatedId", () => {
    const result = parseTreeExport({
      persons: [basePerson],
      relationships: [
        { person_id: "", related_id: "p2", type: "Father" },
        { person_id: "p1", related_id: "", type: "Mother" },
      ],
    });
    expect(result.relationships).toHaveLength(0);
  });

  it("deduplicates symmetric Spouse relationships", () => {
    const result = parseTreeExport({
      persons: [
        basePerson,
        { id: "p2", first_name: "Brigid", family_name: "Murphy", sex: "Female" },
      ],
      relationships: [
        { person_id: "p1", related_id: "p2", type: "Spouse" },
        { person_id: "p2", related_id: "p1", type: "Spouse" },
      ],
    });
    const spouses = result.relationships.filter((r) => r.type === "Spouse");
    expect(spouses).toHaveLength(1);
  });

  it("deduplicates symmetric Sibling relationships", () => {
    const result = parseTreeExport({
      persons: [
        basePerson,
        { id: "p2", first_name: "Brigid", family_name: "Murphy", sex: "Female" },
      ],
      relationships: [
        { person_id: "p1", related_id: "p2", type: "Sibling" },
        { person_id: "p2", related_id: "p1", type: "Sibling" },
      ],
    });
    const siblings = result.relationships.filter((r) => r.type === "Sibling");
    expect(siblings).toHaveLength(1);
  });

  it("does not deduplicate asymmetric Father/Mother relationships", () => {
    const father = { id: "p2", first_name: "Padraig", family_name: "Murphy", sex: "Male" };
    const result = parseTreeExport({
      persons: [basePerson, father],
      relationships: [
        { person_id: "p1", related_id: "p2", type: "Father" },
        { person_id: "p2", related_id: "p1", type: "Father" },
      ],
    });
    const fathers = result.relationships.filter((r) => r.type === "Father");
    expect(fathers).toHaveLength(2);
  });

  it("preserves spouse_from on Spouse relationships", () => {
    const result = parseTreeExport({
      persons: [
        basePerson,
        { id: "p2", first_name: "Brigid", family_name: "Murphy", sex: "Female" },
      ],
      relationships: [
        { person_id: "p1", related_id: "p2", type: "Spouse", spouse_from: "14 JUN 2000" },
      ],
    });
    expect(result.relationships[0].spouse_from).toBe("14 JUN 2000");
  });
});

// ── parseTreeExport — legacy tree-walk format ─────────────────────────────────

describe("parseTreeExport legacy tree-walk format", () => {
  it("extracts a single root person", () => {
    const result = parseTreeExport({
      root: { id: "p1", first_name: "Tom", family_name: "Kelly", sex: "Male" },
    });
    expect(result.persons).toHaveLength(1);
    expect(result.persons[0].originalId).toBe("p1");
    expect(result.persons[0].first_name).toBe("Tom");
  });

  it("walks father and mother arrays recursively", () => {
    const result = parseTreeExport({
      root: {
        id: "child",
        first_name: "Aoife",
        family_name: "Walsh",
        sex: "Female",
        father: [{ id: "dad", first_name: "Peadar", family_name: "Walsh", sex: "Male" }],
        mother: [{ id: "mum", first_name: "Nuala", family_name: "Walsh", sex: "Female" }],
      },
    });
    const ids = result.persons.map((p) => p.originalId);
    expect(ids).toContain("child");
    expect(ids).toContain("dad");
    expect(ids).toContain("mum");

    const father = result.relationships.find((r) => r.type === "Father");
    expect(father?.personId).toBe("child");
    expect(father?.relatedId).toBe("dad");

    const mother = result.relationships.find((r) => r.type === "Mother");
    expect(mother?.personId).toBe("child");
    expect(mother?.relatedId).toBe("mum");
  });

  it("derives Mother role from children when node sex is Female", () => {
    const result = parseTreeExport({
      root: {
        id: "mum",
        first_name: "Nuala",
        family_name: "Walsh",
        sex: "Female",
        children: [{ id: "kid", first_name: "Conor", family_name: "Walsh", sex: "Male" }],
      },
    });
    const mother = result.relationships.find((r) => r.type === "Mother");
    expect(mother?.personId).toBe("kid");
    expect(mother?.relatedId).toBe("mum");
  });

  it("derives Father role from children when node sex is Male", () => {
    const result = parseTreeExport({
      root: {
        id: "dad",
        first_name: "Peadar",
        family_name: "Walsh",
        sex: "Male",
        children: [{ id: "kid", first_name: "Conor", family_name: "Walsh", sex: "Male" }],
      },
    });
    const father = result.relationships.find((r) => r.type === "Father");
    expect(father?.personId).toBe("kid");
    expect(father?.relatedId).toBe("dad");
  });

  it("adds Spouse relationships and visits spouse nodes", () => {
    const result = parseTreeExport({
      root: {
        id: "p1",
        first_name: "Seán",
        family_name: "Murphy",
        sex: "Male",
        spouse: [{ id: "p2", first_name: "Brigid", family_name: "Murphy", sex: "Female" }],
      },
    });
    const spouse = result.relationships.find((r) => r.type === "Spouse");
    expect(spouse).toBeDefined();
    expect(result.persons.map((p) => p.originalId)).toContain("p2");
  });

  it("does not visit the same node twice (cycle prevention)", () => {
    const result = parseTreeExport({
      root: {
        id: "p1",
        first_name: "Seán",
        family_name: "Murphy",
        sex: "Male",
        father: [
          {
            id: "p2",
            first_name: "Tadhg",
            family_name: "Murphy",
            sex: "Male",
            children: [{ id: "p1", first_name: "Seán", family_name: "Murphy", sex: "Male" }],
          },
        ],
      },
    });
    const p1Count = result.persons.filter((p) => p.originalId === "p1").length;
    expect(p1Count).toBe(1);
  });
});
