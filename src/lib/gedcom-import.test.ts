import { describe, it, expect } from "vitest";
import { parseGedcomFile } from "./gedcom-import";

// Helpers to build minimal GEDCOM strings without trailing whitespace noise
function ged(...lines: string[]): string {
  return lines.join("\n") + "\n";
}

describe("parseGedcomFile", () => {
  describe("single INDI record", () => {
    it("parses a minimal person with NAME and SEX", () => {
      const content = ged(
        "0 HEAD",
        "0 @I1@ INDI",
        "1 NAME John /Smith/",
        "1 SEX M",
        "0 TRLR",
      );
      const result = parseGedcomFile(content);
      expect(result.persons).toHaveLength(1);
      const p = result.persons[0];
      expect(p.originalId).toBe("@I1@");
      expect(p.first_name).toBe("John");
      expect(p.family_name).toBe("Smith");
      expect(p.sex).toBe("Male");
    });

    it("parses SEX F as Female", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Jane /Doe/",
        "1 SEX F",
      );
      const { persons } = parseGedcomFile(content);
      expect(persons[0].sex).toBe("Female");
    });

    it("defaults to Male and warns on unknown SEX value", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Alex /Kim/",
        "1 SEX X",
      );
      const { persons, warnings } = parseGedcomFile(content);
      expect(persons[0].sex).toBe("Male");
      expect(warnings).toBeDefined();
      expect(warnings!.some((w) => w.includes("unknown SEX value"))).toBe(true);
    });

    it("defaults to Male and warns when SEX is absent", () => {
      const content = ged("0 @I1@ INDI", "1 NAME Pat /Reilly/");
      const { persons, warnings } = parseGedcomFile(content);
      expect(persons[0].sex).toBe("Male");
      expect(warnings!.some((w) => w.includes("no SEX record"))).toBe(true);
    });

    it("defaults name to Unknown and warns when NAME is absent", () => {
      const content = ged("0 @I1@ INDI", "1 SEX M");
      const { persons, warnings } = parseGedcomFile(content);
      expect(persons[0].first_name).toBe("Unknown");
      expect(persons[0].family_name).toBe("Unknown");
      expect(warnings!.some((w) => w.includes('no NAME record'))).toBe(true);
    });

    it("parses a middle name from the given part", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Mary Anne /Murphy/",
        "1 SEX F",
      );
      const { persons } = parseGedcomFile(content);
      expect(persons[0].first_name).toBe("Mary");
      expect(persons[0].middle_name).toBe("Anne");
      expect(persons[0].family_name).toBe("Murphy");
    });

    it("uses GIVN/SURN/NICK subfields when present, overriding NAME value", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Bill /Jones/",
        "2 GIVN William",
        "2 SURN Jones-Smith",
        "2 NICK Billy",
        "1 SEX M",
      );
      const { persons } = parseGedcomFile(content);
      expect(persons[0].first_name).toBe("William");
      expect(persons[0].family_name).toBe("Jones-Smith");
      expect(persons[0].nickname).toBe("Billy");
    });

    it("extracts BIRT and DEAT events with date and place", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Tom /Ryan/",
        "1 SEX M",
        "1 BIRT",
        "2 DATE 15 JAN 1980",
        "2 PLAC Dublin, Ireland",
        "1 DEAT",
        "2 DATE 20 MAR 2050",
        "2 PLAC Cork, Ireland",
      );
      const { persons } = parseGedcomFile(content);
      expect(persons[0].date_of_birth).toBe("15 JAN 1980");
      expect(persons[0].place_of_birth).toBe("Dublin, Ireland");
      expect(persons[0].date_of_death).toBe("20 MAR 2050");
      expect(persons[0].place_of_death).toBe("Cork, Ireland");
    });

    it("maps NOTE value to biography", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Seán /Ó Briain/",
        "1 SEX M",
        "1 NOTE Born in Connacht.",
      );
      const { persons } = parseGedcomFile(content);
      expect(persons[0].biography).toBe("Born in Connacht.");
    });

    it("concatenates NOTE continuation lines into biography", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Brigid /Walsh/",
        "1 SEX F",
        "1 NOTE First line.",
        "2 CONT Second line.",
        "2 CONC Appended.",
      );
      const { persons } = parseGedcomFile(content);
      expect(persons[0].biography).toBe("First line.\nSecond line.Appended.");
    });

    it("warns and skips biography when NOTE is a pointer reference", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Liam /Burke/",
        "1 SEX M",
        "1 NOTE @N1@",
      );
      const { persons, warnings } = parseGedcomFile(content);
      expect(persons[0].biography).toBeNull();
      expect(warnings!.some((w) => w.includes("NOTE pointer"))).toBe(true);
    });
  });

  describe("FAM record processing", () => {
    it("produces a Spouse relationship from HUSB and WIFE", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Sean /Brennan/",
        "1 SEX M",
        "0 @I2@ INDI",
        "1 NAME Mary /Brennan/",
        "1 SEX F",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
      );
      const { relationships } = parseGedcomFile(content);
      const spouse = relationships.find((r) => r.type === "Spouse");
      expect(spouse).toBeDefined();
      expect(new Set([spouse!.personId, spouse!.relatedId])).toEqual(
        new Set(["@I1@", "@I2@"]),
      );
    });

    it("captures marriage date as spouse_from", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Sean /Brennan/",
        "1 SEX M",
        "0 @I2@ INDI",
        "1 NAME Mary /Brennan/",
        "1 SEX F",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "1 MARR",
        "2 DATE 14 JUN 2000",
      );
      const { relationships } = parseGedcomFile(content);
      const spouse = relationships.find((r) => r.type === "Spouse");
      expect(spouse?.spouse_from).toBe("14 JUN 2000");
    });

    it("derives Father / Mother roles from the sex of HUSB and WIFE", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Padraig /O'Neill/",
        "1 SEX M",
        "0 @I2@ INDI",
        "1 NAME Siobhan /O'Neill/",
        "1 SEX F",
        "0 @I3@ INDI",
        "1 NAME Conor /O'Neill/",
        "1 SEX M",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "1 CHIL @I3@",
      );
      const { relationships } = parseGedcomFile(content);
      const father = relationships.find((r) => r.type === "Father");
      const mother = relationships.find((r) => r.type === "Mother");
      expect(father).toBeDefined();
      expect(father!.personId).toBe("@I3@");
      expect(father!.relatedId).toBe("@I1@");
      expect(mother).toBeDefined();
      expect(mother!.personId).toBe("@I3@");
      expect(mother!.relatedId).toBe("@I2@");
    });

    it("creates Sibling relationships between all children of a FAM", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME Dad /Smith/",
        "1 SEX M",
        "0 @I2@ INDI",
        "1 NAME Mum /Smith/",
        "1 SEX F",
        "0 @I3@ INDI",
        "1 NAME Alice /Smith/",
        "1 SEX F",
        "0 @I4@ INDI",
        "1 NAME Bob /Smith/",
        "1 SEX M",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "1 CHIL @I3@",
        "1 CHIL @I4@",
      );
      const { relationships } = parseGedcomFile(content);
      const siblings = relationships.filter((r) => r.type === "Sibling");
      expect(siblings).toHaveLength(1);
      expect(new Set([siblings[0].personId, siblings[0].relatedId])).toEqual(
        new Set(["@I3@", "@I4@"]),
      );
    });

    it("warns and skips unresolvable FAM references", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME John /Doe/",
        "1 SEX M",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I99@",
      );
      const { relationships, warnings } = parseGedcomFile(content);
      const spouses = relationships.filter((r) => r.type === "Spouse");
      expect(spouses).toHaveLength(0);
      expect(warnings!.some((w) => w.includes("@I99@"))).toBe(true);
    });

    it("does not duplicate symmetric relationships", () => {
      const content = ged(
        "0 @I1@ INDI",
        "1 NAME A /A/",
        "1 SEX M",
        "0 @I2@ INDI",
        "1 NAME B /B/",
        "1 SEX F",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "0 @F2@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
      );
      const { relationships } = parseGedcomFile(content);
      const spouses = relationships.filter((r) => r.type === "Spouse");
      expect(spouses).toHaveLength(1);
    });
  });

  describe("HEAD > FILE tag", () => {
    it("extracts suggestedDisplayName and suggestedName from FILE tag", () => {
      const content = ged(
        "0 HEAD",
        "1 FILE My Family Tree.ged",
        "0 @I1@ INDI",
        "1 NAME X /X/",
        "1 SEX M",
      );
      const { suggestedDisplayName, suggestedName } = parseGedcomFile(content);
      expect(suggestedDisplayName).toBe("My Family Tree");
      expect(suggestedName).toBe("my-family-tree");
    });

    it("returns empty strings when no FILE tag is present", () => {
      const content = ged("0 HEAD", "0 @I1@ INDI", "1 NAME X /X/", "1 SEX M");
      const { suggestedDisplayName, suggestedName } = parseGedcomFile(content);
      expect(suggestedDisplayName).toBe("");
      expect(suggestedName).toBe("");
    });
  });

  describe("line ending handling", () => {
    it("parses CRLF line endings correctly", () => {
      const content = "0 HEAD\r\n0 @I1@ INDI\r\n1 NAME Jo /White/\r\n1 SEX F\r\n";
      const { persons } = parseGedcomFile(content);
      expect(persons).toHaveLength(1);
      expect(persons[0].first_name).toBe("Jo");
      expect(persons[0].sex).toBe("Female");
    });
  });
});
