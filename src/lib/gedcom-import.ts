// GEDCOM 5.5.1 importer.
// Parses a .ged file into the same ParsedImport shape used by the JSON importer,
// with a warnings array for anything that could not be fully resolved.

import type { Pedigree, Sex, SiblingType } from "./types";
import { type ParsedImport, type ImportPerson, type ImportRelationship, slugify } from "./tree-import";

// ── GEDCOM line parser ────────────────────────────────────────────────────────

interface GedLine {
  level: number;
  xref: string | null; // e.g. @I1@ — only on level-0 record starters
  tag: string;
  value: string;
}

function parseLine(raw: string): GedLine | null {
  const s = raw.trim();
  if (!s) return null;
  // LEVEL [XREF] TAG [VALUE]
  const m = s.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/);
  if (!m) return null;
  return {
    level: parseInt(m[1], 10),
    xref: m[2] ?? null,
    tag: m[3].toUpperCase(),
    value: (m[4] ?? "").trim(),
  };
}

// ── Record grouping ───────────────────────────────────────────────────────────

interface GedRecord {
  xref: string;        // e.g. @I1@
  type: string;        // INDI, FAM, NOTE, …
  lines: GedLine[];    // all level > 0 lines belonging to this record
}

function groupRecords(content: string): { records: GedRecord[]; fileTag: string } {
  const records: GedRecord[] = [];
  let current: GedRecord | null = null;
  let inHead = false;
  let fileTag = "";

  for (const raw of content.split(/\r?\n/)) {
    const line = parseLine(raw);
    if (!line) continue;

    if (line.level === 0) {
      if (current) records.push(current);
      current = null;
      inHead = false;

      if (line.xref) {
        current = { xref: line.xref, type: line.tag, lines: [] };
      } else if (line.tag === "HEAD") {
        inHead = true;
      }
    } else if (current) {
      current.lines.push(line);
    } else if (inHead && line.tag === "FILE" && line.value) {
      // Extract suggested tree name from HEAD > FILE
      fileTag = line.value.replace(/\.[^.]+$/, ""); // strip extension
    }
  }

  if (current) records.push(current);
  return { records, fileTag };
}

// ── INDI record parser ────────────────────────────────────────────────────────

function parseIndi(rec: GedRecord, warnings: string[]): ImportPerson {
  const lines = rec.lines;

  // Helper: get level-2 subfields immediately following a level-1 line at index idx
  function subfields(idx: number): GedLine[] {
    const subs: GedLine[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].level <= 1) break;
      subs.push(lines[i]);
    }
    return subs;
  }

  // ── NAME ──────────────────────────────────────────────────────────────────

  let firstName = "Unknown";
  let middleName: string | null = null;
  let familyName = "Unknown";
  let nickname: string | null = null;

  const nameIdx = lines.findIndex((l) => l.level === 1 && l.tag === "NAME");
  if (nameIdx >= 0) {
    const nameVal = lines[nameIdx].value;
    // Parse "First [Middle] /Family/" pattern
    const surnameMatch = nameVal.match(/\/([^/]*)\/$/);
    if (surnameMatch) familyName = surnameMatch[1].trim() || "Unknown";
    const givenStr = nameVal.replace(/\/[^/]*\/$/, "").trim();
    const givenWords = givenStr.split(/\s+/).filter(Boolean);
    if (givenWords.length > 0) firstName = givenWords[0];
    if (givenWords.length > 1) middleName = givenWords.slice(1).join(" ");

    // Prefer explicit GIVN / SURN / NICK subfields if present
    for (const sub of subfields(nameIdx)) {
      if (sub.tag === "GIVN" && sub.value) {
        const ws = sub.value.split(/\s+/).filter(Boolean);
        firstName = ws[0] ?? firstName;
        middleName = ws.length > 1 ? ws.slice(1).join(" ") : null;
      } else if (sub.tag === "SURN" && sub.value) {
        familyName = sub.value;
      } else if (sub.tag === "NICK" && sub.value) {
        nickname = sub.value;
      }
    }
  } else {
    warnings.push(`${rec.xref}: no NAME record — defaulted to "Unknown"`);
  }

  // ── SEX ───────────────────────────────────────────────────────────────────

  let sex: Sex = "Male";
  const sexLine = lines.find((l) => l.level === 1 && l.tag === "SEX");
  if (sexLine) {
    const v = sexLine.value.toUpperCase();
    if (v === "F") sex = "Female";
    else if (v !== "M") {
      warnings.push(`${rec.xref} (${firstName} ${familyName}): unknown SEX value '${sexLine.value}' — defaulted to Male`);
    }
  } else {
    warnings.push(`${rec.xref} (${firstName} ${familyName}): no SEX record — defaulted to Male`);
  }

  // ── Event helper (BIRT, DEAT) ─────────────────────────────────────────────

  function parseEvent(tag: string): { date: string | null; place: string | null } {
    const idx = lines.findIndex((l) => l.level === 1 && l.tag === tag);
    if (idx < 0) return { date: null, place: null };
    let date: string | null = null;
    let place: string | null = null;
    for (const sub of subfields(idx)) {
      if (sub.tag === "DATE" && sub.value) date = sub.value;
      else if (sub.tag === "PLAC" && sub.value) place = sub.value;
    }
    return { date, place };
  }

  const birt = parseEvent("BIRT");
  const deat = parseEvent("DEAT");

  // ── NOTE → biography ──────────────────────────────────────────────────────

  let biography: string | null = null;
  const noteIdx = lines.findIndex((l) => l.level === 1 && l.tag === "NOTE");
  if (noteIdx >= 0) {
    const noteVal = lines[noteIdx].value;
    if (noteVal.startsWith("@")) {
      // Pointer to a NOTE record — skip (would require a second lookup pass)
      warnings.push(`${rec.xref} (${firstName} ${familyName}): NOTE pointer ${noteVal} not resolved — biography skipped`);
    } else {
      const parts: string[] = [noteVal];
      for (const sub of subfields(noteIdx)) {
        if (sub.tag === "CONT") parts.push("\n" + sub.value);
        else if (sub.tag === "CONC") parts.push(sub.value);
      }
      biography = parts.join("") || null;
    }
  }

  return {
    originalId: rec.xref,
    first_name: firstName,
    family_name: familyName,
    sex,
    middle_name: middleName ?? null,
    nickname,
    date_of_birth: birt.date,
    place_of_birth: birt.place,
    date_of_death: deat.date,
    place_of_death: deat.place,
    biography,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseGedcomFile(content: string): ParsedImport {
  const warnings: string[] = [];
  const { records, fileTag } = groupRecords(content);

  const indiRecords = records.filter((r) => r.type === "INDI");
  const famRecords  = records.filter((r) => r.type === "FAM");

  // Build person map xref → ImportPerson
  const personMap = new Map<string, ImportPerson>();
  for (const rec of indiRecords) {
    personMap.set(rec.xref, parseIndi(rec, warnings));
  }

  // Build relationships from FAM records
  const relKeys = new Set<string>();
  const relationships: ImportRelationship[] = [];

  function addRel(
    type: ImportRelationship["type"],
    personId: string,
    relatedId: string,
    extra?: Partial<ImportRelationship>,
  ) {
    // For parent relations, pedigree is part of the key so birth + adopted can coexist.
    const key =
      type === "Spouse" || type === "Sibling"
        ? `${type}:${[personId, relatedId].sort().join(":")}`
        : `${type}:${personId}:${relatedId}:${extra?.pedigree ?? "birth"}`;
    if (!relKeys.has(key)) {
      relKeys.add(key);
      relationships.push({ type, personId, relatedId, ...extra });
    }
  }

  // Build a PEDI map from each INDI's FAMC records: famXref+indiXref → pedigree
  const famcPedigreeMap = new Map<string, Pedigree>();
  for (const rec of indiRecords) {
    let i = 0;
    while (i < rec.lines.length) {
      const line = rec.lines[i];
      if (line.level === 1 && line.tag === "FAMC") {
        const famRef = line.value;
        // Look for PEDI subfield
        for (let j = i + 1; j < rec.lines.length; j++) {
          if (rec.lines[j].level <= 1) break;
          if (rec.lines[j].tag === "PEDI") {
            const v = rec.lines[j].value.toLowerCase() as Pedigree;
            if (["birth", "adopted", "step", "foster"].includes(v)) {
              famcPedigreeMap.set(`${famRef}:${rec.xref}`, v);
            }
            break;
          }
        }
      }
      i++;
    }
  }

  for (const fam of famRecords) {
    const famLines = fam.lines;

    const husbRef = famLines.find((l) => l.level === 1 && l.tag === "HUSB")?.value ?? null;
    const wifeRef = famLines.find((l) => l.level === 1 && l.tag === "WIFE")?.value ?? null;
    const childRefs = famLines.filter((l) => l.level === 1 && l.tag === "CHIL").map((l) => l.value);

    // Marriage date from MARR event
    let marriageDate: string | null = null;
    const marrIdx = famLines.findIndex((l) => l.level === 1 && l.tag === "MARR");
    if (marrIdx >= 0) {
      for (let i = marrIdx + 1; i < famLines.length; i++) {
        if (famLines[i].level <= 1) break;
        if (famLines[i].tag === "DATE" && famLines[i].value) {
          marriageDate = famLines[i].value;
          break;
        }
      }
    }

    // Validate references
    if (husbRef && !personMap.has(husbRef)) {
      warnings.push(`FAM ${fam.xref}: husband ${husbRef} not found — skipped`);
    }
    if (wifeRef && !personMap.has(wifeRef)) {
      warnings.push(`FAM ${fam.xref}: wife ${wifeRef} not found — skipped`);
    }

    const validHusb = husbRef && personMap.has(husbRef) ? husbRef : null;
    const validWife = wifeRef && personMap.has(wifeRef) ? wifeRef : null;

    // Spouse relationship
    if (validHusb && validWife) {
      addRel("Spouse", validHusb, validWife, { spouse_from: marriageDate });
    }

    // Parent–child relationships
    const validChildren: string[] = [];
    for (const childRef of childRefs) {
      if (!personMap.has(childRef)) {
        warnings.push(`FAM ${fam.xref}: child ${childRef} not found — skipped`);
        continue;
      }
      validChildren.push(childRef);

      const childPedigree = famcPedigreeMap.get(`${fam.xref}:${childRef}`) ?? "birth";

      // Use sex of the HUSB/WIFE to decide Father vs Mother
      if (validHusb) {
        const p = personMap.get(validHusb)!;
        addRel(p.sex === "Female" ? "Mother" : "Father", childRef, validHusb, { pedigree: childPedigree });
      }
      if (validWife) {
        const p = personMap.get(validWife)!;
        addRel(p.sex === "Male" ? "Father" : "Mother", childRef, validWife, { pedigree: childPedigree });
      }
    }

    // Sibling relationships between children sharing this FAM
    for (let i = 0; i < validChildren.length; i++) {
      for (let j = i + 1; j < validChildren.length; j++) {
        const c1 = validChildren[i];
        const c2 = validChildren[j];
        const c2Person = personMap.get(c2)!;
        const sibType: SiblingType = c2Person.sex === "Female" ? "Sister" : "Brother";
        addRel("Sibling", c1, c2, { sibling_type: sibType });
      }
    }

    if (!validHusb && !validWife && validChildren.length > 0) {
      warnings.push(`FAM ${fam.xref}: has ${validChildren.length} child(ren) but no parents — sibling links added, parent links skipped`);
    }
  }

  const suggestedDisplayName = fileTag || "";
  const suggestedName = fileTag ? slugify(fileTag) : "";

  return {
    persons: Array.from(personMap.values()),
    relationships,
    suggestedName,
    suggestedDisplayName,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
