import type { FamilyTreeNode, Sex, SiblingType } from "./types";

export interface ImportPerson {
  originalId: string;
  first_name: string;
  family_name: string;
  sex: Sex;
  date_of_birth?: string | null;
  place_of_birth?: string | null;
  place_of_death?: string | null;
  date_of_death?: string | null;
  middle_name?: string | null;
  nickname?: string | null;
  username?: string | null;
  email?: string | null;
  biography?: string | null;
  verified?: boolean;
}

export interface ImportRelationship {
  type: "Father" | "Mother" | "Sibling" | "Spouse";
  /** Original ID of the subject (the child, or either party for sibling/spouse) */
  personId: string;
  /** Original ID of the related person */
  relatedId: string;
  sibling_type?: SiblingType | null;
  spouse_from?: string | null;
  spouse_to?: string | null;
}

export interface ParsedImport {
  persons: ImportPerson[];
  relationships: ImportRelationship[];
  suggestedName: string;
  suggestedDisplayName: string;
}

/** Validate and parse the JSON export format into flat persons + relationships lists. */
export function parseTreeExport(raw: unknown): ParsedImport {
  if (!raw || typeof raw !== "object") throw new Error("Invalid file: expected a JSON object");
  const obj = raw as Record<string, unknown>;

  const suggestedName = typeof obj.tree_name === "string" ? obj.tree_name : "";
  const suggestedDisplayName = typeof obj.tree_display_name === "string" ? obj.tree_display_name : "";

  // New flat format: { persons: [...], relationships: [...] }
  if (Array.isArray(obj.persons)) {
    return parseFlatExport(obj, suggestedName, suggestedDisplayName);
  }

  // Legacy tree-walk format: { root: FamilyTreeNode }
  if (!obj.root || typeof obj.root !== "object") {
    throw new Error("Invalid file: missing 'persons' or 'root' field");
  }
  return parseTreeWalkExport(obj, suggestedName, suggestedDisplayName);
}

// ── Flat format parser ────────────────────────────────────────────────────────

function parseFlatExport(
  obj: Record<string, unknown>,
  suggestedName: string,
  suggestedDisplayName: string,
): ParsedImport {
  const rawPersons = obj.persons as Record<string, unknown>[];
  const rawRels = Array.isArray(obj.relationships)
    ? (obj.relationships as Record<string, unknown>[])
    : [];

  const persons: ImportPerson[] = rawPersons.map((p) => ({
    originalId: String(p.id ?? ""),
    first_name: String(p.first_name ?? ""),
    family_name: String(p.family_name ?? ""),
    sex: (p.sex as Sex) ?? "Male",
    date_of_birth: (p.date_of_birth as string | null) ?? null,
    date_of_death: (p.date_of_death as string | null) ?? null,
    place_of_birth: (p.place_of_birth as string | null) ?? null,
    place_of_death: (p.place_of_death as string | null) ?? null,
    middle_name: (p.middle_name as string | null) ?? null,
    nickname: (p.nickname as string | null) ?? null,
    username: (p.username as string | null) ?? null,
    email: (p.email as string | null) ?? null,
    biography: (p.biography as string | null) ?? null,
    verified: typeof p.verified === "boolean" ? p.verified : undefined,
  }));

  const relKeys = new Set<string>();
  const relationships: ImportRelationship[] = [];

  for (const r of rawRels) {
    const type = r.type as ImportRelationship["type"];
    if (!["Father", "Mother", "Sibling", "Spouse"].includes(type)) continue;
    const personId = String(r.person_id ?? "");
    const relatedId = String(r.related_id ?? "");
    if (!personId || !relatedId) continue;

    const key =
      type === "Spouse" || type === "Sibling"
        ? `${type}:${[personId, relatedId].sort().join(":")}`
        : `${type}:${personId}:${relatedId}`;
    if (!relKeys.has(key)) {
      relKeys.add(key);
      relationships.push({
        type,
        personId,
        relatedId,
        sibling_type: (r.sibling_type as SiblingType | null) ?? null,
        spouse_from: (r.spouse_from as string | null) ?? null,
        spouse_to: (r.spouse_to as string | null) ?? null,
      });
    }
  }

  return { persons, relationships, suggestedName, suggestedDisplayName };
}

// ── Legacy tree-walk format parser ───────────────────────────────────────────

function parseTreeWalkExport(
  obj: Record<string, unknown>,
  suggestedName: string,
  suggestedDisplayName: string,
): ParsedImport {
  const persons = new Map<string, ImportPerson>();
  const relKeys = new Set<string>();
  const relationships: ImportRelationship[] = [];

  function addRel(type: "Father" | "Mother" | "Sibling" | "Spouse", personId: string, relatedId: string, siblingType?: SiblingType | null) {
    const key =
      type === "Spouse" || type === "Sibling"
        ? `${type}:${[personId, relatedId].sort().join(":")}`
        : `${type}:${personId}:${relatedId}`;
    if (!relKeys.has(key)) {
      relKeys.add(key);
      relationships.push({ type, personId, relatedId, sibling_type: siblingType ?? null });
    }
  }

  function walk(node: FamilyTreeNode) {
    if (persons.has(node.id)) return;

    persons.set(node.id, {
      originalId: node.id,
      first_name: node.first_name,
      family_name: node.family_name,
      sex: node.sex ?? "Male",
      date_of_birth: node.date_of_birth ?? null,
      place_of_birth: node.place_of_birth ?? null,
      biography: node.biography ?? null,
    });

    for (const father of node.father ?? []) {
      addRel("Father", node.id, father.id);
      walk(father);
    }
    for (const mother of node.mother ?? []) {
      addRel("Mother", node.id, mother.id);
      walk(mother);
    }
    for (const child of node.children ?? []) {
      const relType = node.sex === "Female" ? "Mother" : "Father";
      addRel(relType, child.id, node.id);
      walk(child);
    }
    for (const spouse of node.spouse ?? []) {
      addRel("Spouse", node.id, spouse.id);
      walk(spouse);
    }
    for (const sibling of node.siblings ?? []) {
      const siblingType: SiblingType = sibling.sibling_type ?? (sibling.sex === "Female" ? "Sister" : "Brother");
      addRel("Sibling", node.id, sibling.id, siblingType);
      walk(sibling);
    }
  }

  walk(obj.root as FamilyTreeNode);

  return {
    persons: Array.from(persons.values()),
    relationships,
    suggestedName,
    suggestedDisplayName,
  };
}
