// GEDCOM 5.5.1 export for a Clann family tree.
// Takes the same persons/relationships arrays produced by the JSON export.

export interface GedcomPerson {
  id: string;
  first_name: string;
  family_name: string;
  middle_name?: string | null;
  sex?: string | null;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  place_of_birth?: string | null;
  place_of_death?: string | null;
  nickname?: string | null;
  biography?: string | null;
}

export interface GedcomRelationship {
  type: string; // "Father" | "Mother" | "Sibling" | "Spouse"
  person_id: string;
  related_id: string;
  spouse_from?: string | null;
  spouse_to?: string | null;
  pedigree?: string | null; // "birth" | "adopted" | "half"
}

interface FamRecord {
  gedId: string;
  husbId: string | null;
  wifeId: string | null;
  childIds: string[];
  marriageDate: string | null;
}

export function exportToGedcom(
  persons: GedcomPerson[],
  relationships: GedcomRelationship[],
  treeName: string
): string {
  // person ID → GEDCOM INDI tag (@I1@, @I2@, …)
  const indiId = new Map<string, string>();
  persons.forEach((p, i) => indiId.set(p.id, `@I${i + 1}@`));

  // Build relationship indexes
  // A person may have multiple fathers or mothers (birth + adoptive), so use arrays.
  const fathersOf = new Map<string, { id: string; pedigree: string }[]>();
  const mothersOf = new Map<string, { id: string; pedigree: string }[]>();
  const spousePairs: { a: string; b: string; from: string | null }[] = [];

  for (const rel of relationships) {
    if (rel.type === "Father") {
      const arr = fathersOf.get(rel.person_id) ?? [];
      arr.push({ id: rel.related_id, pedigree: rel.pedigree ?? "birth" });
      fathersOf.set(rel.person_id, arr);
    } else if (rel.type === "Mother") {
      const arr = mothersOf.get(rel.person_id) ?? [];
      arr.push({ id: rel.related_id, pedigree: rel.pedigree ?? "birth" });
      mothersOf.set(rel.person_id, arr);
    } else if (rel.type === "Spouse") {
      const [a, b] = [rel.person_id, rel.related_id].sort();
      if (!spousePairs.some((p) => p.a === a && p.b === b)) {
        spousePairs.push({ a, b, from: rel.spouse_from ?? null });
      }
    }
    // Sibling relationships are derivable from shared parents — skipped in GEDCOM
  }

  const personById = new Map(persons.map((p) => [p.id, p]));

  // Assign HUSB/WIFE based on sex (fall back to canonical sort order)
  function husbWife(idA: string, idB: string): { husbId: string; wifeId: string } {
    const a = personById.get(idA);
    const b = personById.get(idB);
    if (a?.sex === "Female" && b?.sex !== "Female") return { husbId: idB, wifeId: idA };
    if (b?.sex === "Female" && a?.sex !== "Female") return { husbId: idA, wifeId: idB };
    return { husbId: idA, wifeId: idB }; // same-sex or unknown — arbitrary order
  }

  // Build FAM records
  const fams: FamRecord[] = [];
  let famCounter = 0;

  function findOrCreateFam(husbId: string | null, wifeId: string | null): FamRecord {
    const existing = fams.find((f) => f.husbId === husbId && f.wifeId === wifeId);
    if (existing) return existing;
    famCounter++;
    const fam: FamRecord = { gedId: `@F${famCounter}@`, husbId, wifeId, childIds: [], marriageDate: null };
    fams.push(fam);
    return fam;
  }

  // Spouse pairs → FAM records
  for (const pair of spousePairs) {
    const { husbId, wifeId } = husbWife(pair.a, pair.b);
    const fam = findOrCreateFam(husbId, wifeId);
    if (pair.from) fam.marriageDate = pair.from;
  }

  // Children → find/create a FAM per unique (father, mother) pairing.
  // A child with birth + adoptive parents gets two FAMC links with PEDI tags.
  const famcPedigree = new Map<string, string>(); // `${famGedId}:${personId}` → pedigree

  for (const person of persons) {
    const fathers = fathersOf.get(person.id) ?? [];
    const mothers = mothersOf.get(person.id) ?? [];

    if (fathers.length === 0 && mothers.length === 0) continue;

    // Group parents by pedigree to create one FAM per pairing
    const pedigreeGroups = new Map<string, { fId: string | null; mId: string | null }>();

    for (const f of fathers) {
      const g = pedigreeGroups.get(f.pedigree) ?? { fId: null, mId: null };
      g.fId = f.id;
      pedigreeGroups.set(f.pedigree, g);
    }
    for (const m of mothers) {
      const g = pedigreeGroups.get(m.pedigree) ?? { fId: null, mId: null };
      g.mId = m.id;
      pedigreeGroups.set(m.pedigree, g);
    }

    for (const [ped, { fId, mId }] of pedigreeGroups) {
      let husbId: string | null = null;
      let wifeId: string | null = null;

      if (fId && mId) {
        const result = husbWife(fId, mId);
        husbId = result.husbId;
        wifeId = result.wifeId;
      } else if (fId) {
        const f = personById.get(fId);
        if (f?.sex === "Female") wifeId = fId; else husbId = fId;
      } else if (mId) {
        const m = personById.get(mId);
        if (m?.sex === "Male") husbId = mId; else wifeId = mId;
      }

      const fam = findOrCreateFam(husbId, wifeId);
      if (!fam.childIds.includes(person.id)) fam.childIds.push(person.id);
      famcPedigree.set(`${fam.gedId}:${person.id}`, ped);
    }
  }

  // Reverse index: person id → FAM ids where they are a spouse (FAMS) or child (FAMC)
  const famsOf = new Map<string, string[]>();
  const famcOf = new Map<string, string[]>();

  for (const fam of fams) {
    for (const id of [fam.husbId, fam.wifeId]) {
      if (!id) continue;
      if (!famsOf.has(id)) famsOf.set(id, []);
      famsOf.get(id)!.push(fam.gedId);
    }
    for (const childId of fam.childIds) {
      if (!famcOf.has(childId)) famcOf.set(childId, []);
      famcOf.get(childId)!.push(fam.gedId);
    }
  }

  // Helpers
  function esc(v: string): string {
    // Escape @ characters that aren't cross-references
    return v.replace(/@/g, "@@");
  }

  function noteLines(bio: string, level: number): string[] {
    const tag = level === 1 ? "NOTE" : "CONT";
    const out: string[] = [];
    const rawLines = bio.split(/\r?\n/);
    rawLines.forEach((line, i) => {
      const escaped = esc(line);
      out.push(i === 0 ? `${level} ${tag} ${escaped}` : `${level + 1} CONT ${escaped}`);
    });
    return out;
  }

  const lines: string[] = [];

  // ── Header ───────────────────────────────────────────────────────────────────
  lines.push("0 HEAD");
  lines.push("1 SOUR Clann");
  lines.push("2 NAME Clann Family Tree");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("1 CHAR UTF-8");
  lines.push(`1 FILE ${treeName}.ged`);

  // ── INDI records ─────────────────────────────────────────────────────────────
  for (const p of persons) {
    const gedId = indiId.get(p.id)!;
    lines.push(`0 ${gedId} INDI`);

    // NAME
    const givenParts = [p.first_name, p.middle_name].filter(Boolean).join(" ");
    const fullName = `${givenParts} /${p.family_name}/`;
    lines.push(`1 NAME ${esc(fullName)}`);
    lines.push(`2 GIVN ${esc(givenParts)}`);
    lines.push(`2 SURN ${esc(p.family_name)}`);
    if (p.nickname) lines.push(`2 NICK ${esc(p.nickname)}`);

    // SEX
    if (p.sex === "Male") lines.push("1 SEX M");
    else if (p.sex === "Female") lines.push("1 SEX F");

    // BIRT
    if (p.date_of_birth || p.place_of_birth) {
      lines.push("1 BIRT");
      if (p.date_of_birth) lines.push(`2 DATE ${esc(p.date_of_birth)}`);
      if (p.place_of_birth) lines.push(`2 PLAC ${esc(p.place_of_birth)}`);
    }

    // DEAT
    if (p.date_of_death || p.place_of_death) {
      lines.push("1 DEAT");
      if (p.date_of_death) lines.push(`2 DATE ${esc(p.date_of_death)}`);
      if (p.place_of_death) lines.push(`2 PLAC ${esc(p.place_of_death)}`);
    }

    // FAMS / FAMC
    for (const famId of famsOf.get(p.id) ?? []) lines.push(`1 FAMS ${famId}`);
    for (const famId of famcOf.get(p.id) ?? []) {
      lines.push(`1 FAMC ${famId}`);
      const ped = famcPedigree.get(`${famId}:${p.id}`);
      // "half" has no GEDCOM 5.5 PEDI equivalent — the FAM structure already implies it.
      // Only export "adopted" as a PEDI tag.
      if (ped && ped === "adopted") lines.push(`2 PEDI ${ped}`);
    }

    // NOTE (biography)
    if (p.biography) lines.push(...noteLines(p.biography, 1));
  }

  // ── FAM records ──────────────────────────────────────────────────────────────
  for (const fam of fams) {
    lines.push(`0 ${fam.gedId} FAM`);
    if (fam.husbId) {
      const id = indiId.get(fam.husbId);
      if (id) lines.push(`1 HUSB ${id}`);
    }
    if (fam.wifeId) {
      const id = indiId.get(fam.wifeId);
      if (id) lines.push(`1 WIFE ${id}`);
    }
    if (fam.marriageDate) {
      lines.push("1 MARR");
      lines.push(`2 DATE ${esc(fam.marriageDate)}`);
    }
    for (const childId of fam.childIds) {
      const id = indiId.get(childId);
      if (id) lines.push(`1 CHIL ${id}`);
    }
  }

  // ── Trailer ──────────────────────────────────────────────────────────────────
  lines.push("0 TRAI");

  return lines.join("\r\n") + "\r\n";
}
