import { describe, it, expect } from "vitest";
import { exportToGedcom, type GedcomPerson, type GedcomRelationship } from "./gedcom-export";

function parsedLines(output: string): string[] {
  // Strip the trailing CRLF, then split by CRLF
  return output.replace(/\r\n$/, "").split("\r\n");
}

const MALE: GedcomPerson = {
  id: "p1",
  first_name: "Seán",
  family_name: "Murphy",
  sex: "Male",
};

const FEMALE: GedcomPerson = {
  id: "p2",
  first_name: "Brigid",
  family_name: "Murphy",
  sex: "Female",
};

describe("exportToGedcom", () => {
  it("produces CRLF line endings throughout", () => {
    const output = exportToGedcom([MALE], [], "test-tree");
    expect(output.endsWith("\r\n")).toBe(true);
    // Every line must end with CRLF (no bare LF)
    const linesLF = output.split("\n");
    for (const line of linesLF.slice(0, -1)) {
      expect(line.endsWith("\r")).toBe(true);
    }
  });

  it("starts with header and ends with trailer", () => {
    const lines = parsedLines(exportToGedcom([], [], "my-tree"));
    expect(lines[0]).toBe("0 HEAD");
    expect(lines[lines.length - 1]).toBe("0 TRAI");
  });

  it("includes FILE tag in header using treeName", () => {
    const lines = parsedLines(exportToGedcom([], [], "smith-family"));
    expect(lines).toContain("1 FILE smith-family.ged");
  });

  it("emits correct INDI structure for a single person", () => {
    const lines = parsedLines(exportToGedcom([MALE], [], "t"));
    expect(lines).toContain("0 @I1@ INDI");
    expect(lines).toContain("1 NAME Seán /Murphy/");
    expect(lines).toContain("2 GIVN Seán");
    expect(lines).toContain("2 SURN Murphy");
    expect(lines).toContain("1 SEX M");
  });

  it("outputs SEX F for a Female person", () => {
    const lines = parsedLines(exportToGedcom([FEMALE], [], "t"));
    expect(lines).toContain("1 SEX F");
  });

  it("omits SEX line when sex is null or not set", () => {
    const p: GedcomPerson = { id: "p3", first_name: "Alex", family_name: "Kelly" };
    const lines = parsedLines(exportToGedcom([p], [], "t"));
    expect(lines.some((l) => l.startsWith("1 SEX"))).toBe(false);
  });

  it("includes NICK subfield when nickname is present", () => {
    const p: GedcomPerson = { ...MALE, nickname: "Shay" };
    const lines = parsedLines(exportToGedcom([p], [], "t"));
    expect(lines).toContain("2 NICK Shay");
  });

  it("includes BIRT/DEAT events when dates/places are set", () => {
    const p: GedcomPerson = {
      ...MALE,
      date_of_birth: "15 JAN 1980",
      place_of_birth: "Dublin",
      date_of_death: "20 MAR 2050",
      place_of_death: "Cork",
    };
    const lines = parsedLines(exportToGedcom([p], [], "t"));
    expect(lines).toContain("1 BIRT");
    expect(lines).toContain("2 DATE 15 JAN 1980");
    expect(lines).toContain("2 PLAC Dublin");
    expect(lines).toContain("1 DEAT");
    expect(lines).toContain("2 DATE 20 MAR 2050");
    expect(lines).toContain("2 PLAC Cork");
  });

  it("omits BIRT/DEAT blocks when neither date nor place is set", () => {
    const lines = parsedLines(exportToGedcom([MALE], [], "t"));
    expect(lines).not.toContain("1 BIRT");
    expect(lines).not.toContain("1 DEAT");
  });

  it("emits NOTE for biography, with CONT for subsequent lines", () => {
    const p: GedcomPerson = {
      ...MALE,
      biography: "First line.\nSecond line.",
    };
    const lines = parsedLines(exportToGedcom([p], [], "t"));
    expect(lines).toContain("1 NOTE First line.");
    expect(lines).toContain("2 CONT Second line.");
  });

  it("escapes @ characters in names as @@", () => {
    const p: GedcomPerson = {
      id: "p1",
      first_name: "Test@Name",
      family_name: "Smith",
      sex: "Male",
    };
    const lines = parsedLines(exportToGedcom([p], [], "t"));
    expect(lines.some((l) => l.includes("Test@@Name"))).toBe(true);
  });

  it("creates a FAM record for a Spouse relationship", () => {
    const rels: GedcomRelationship[] = [
      { type: "Spouse", person_id: "p1", related_id: "p2" },
    ];
    const lines = parsedLines(exportToGedcom([MALE, FEMALE], rels, "t"));
    expect(lines.some((l) => l.match(/^0 @F\d+@ FAM$/))).toBe(true);
    expect(lines).toContain("1 HUSB @I1@");
    expect(lines).toContain("1 WIFE @I2@");
  });

  it("includes MARR/DATE in FAM when spouse_from is set", () => {
    const rels: GedcomRelationship[] = [
      { type: "Spouse", person_id: "p1", related_id: "p2", spouse_from: "14 JUN 2000" },
    ];
    const lines = parsedLines(exportToGedcom([MALE, FEMALE], rels, "t"));
    expect(lines).toContain("1 MARR");
    expect(lines).toContain("2 DATE 14 JUN 2000");
  });

  it("adds CHIL in FAM for parent-child relationships", () => {
    const child: GedcomPerson = { id: "p3", first_name: "Conor", family_name: "Murphy", sex: "Male" };
    const rels: GedcomRelationship[] = [
      { type: "Spouse", person_id: "p1", related_id: "p2" },
      { type: "Father", person_id: "p3", related_id: "p1" },
      { type: "Mother", person_id: "p3", related_id: "p2" },
    ];
    const lines = parsedLines(exportToGedcom([MALE, FEMALE, child], rels, "t"));
    expect(lines).toContain("1 CHIL @I3@");
  });

  it("emits FAMS and FAMC back-links on INDI records", () => {
    const child: GedcomPerson = { id: "p3", first_name: "Aoife", family_name: "Murphy", sex: "Female" };
    const rels: GedcomRelationship[] = [
      { type: "Spouse", person_id: "p1", related_id: "p2" },
      { type: "Father", person_id: "p3", related_id: "p1" },
      { type: "Mother", person_id: "p3", related_id: "p2" },
    ];
    const lines = parsedLines(exportToGedcom([MALE, FEMALE, child], rels, "t"));
    // Parents should have FAMS, child should have FAMC
    expect(lines.some((l) => l.match(/^1 FAMS @F\d+@$/))).toBe(true);
    expect(lines.some((l) => l.match(/^1 FAMC @F\d+@$/))).toBe(true);
  });

  it("does not emit any output for Sibling relationships", () => {
    const sibling: GedcomPerson = { id: "p2", first_name: "Alice", family_name: "Smith", sex: "Female" };
    const rels: GedcomRelationship[] = [
      { type: "Sibling", person_id: "p1", related_id: "p2" },
    ];
    const lines = parsedLines(exportToGedcom([MALE, sibling], rels, "t"));
    // No FAM records created for sibling-only relationships
    expect(lines.some((l) => l.match(/^0 @F\d+@ FAM$/))).toBe(false);
  });

  it("assigns sequential INDI IDs (@I1@, @I2@, …) in person order", () => {
    const p2: GedcomPerson = { id: "p2", first_name: "B", family_name: "B", sex: "Female" };
    const p3: GedcomPerson = { id: "p3", first_name: "C", family_name: "C", sex: "Male" };
    const lines = parsedLines(exportToGedcom([MALE, p2, p3], [], "t"));
    expect(lines).toContain("0 @I1@ INDI");
    expect(lines).toContain("0 @I2@ INDI");
    expect(lines).toContain("0 @I3@ INDI");
  });
});
