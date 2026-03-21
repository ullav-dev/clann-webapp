import type { FamilyTreeNode, Sex, SiblingType } from "./types";

export interface ImportPerson {
  originalId: string;
  first_name: string;
  family_name: string;
  sex: Sex;
  date_of_birth?: string | null;
  place_of_birth?: string | null;
  biography?: string | null;
}

export interface ImportRelationship {
  type: "Father" | "Mother" | "Sibling" | "Spouse";
  /** Original ID of the subject (the child, or either party for sibling/spouse) */
  personId: string;
  /** Original ID of the related person */
  relatedId: string;
  sibling_type?: SiblingType | null;
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

  if (!obj.root || typeof obj.root !== "object") {
    throw new Error("Invalid file: missing 'root' field");
  }

  const persons = new Map<string, ImportPerson>();
  const relKeys = new Set<string>();
  const relationships: ImportRelationship[] = [];

  function addRel(type: "Father" | "Mother" | "Sibling" | "Spouse", personId: string, relatedId: string, siblingType?: SiblingType | null) {
    // For symmetric types, use a canonical key so each pair is added once
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
    suggestedName: typeof obj.tree_name === "string" ? obj.tree_name : "",
    suggestedDisplayName: typeof obj.tree_display_name === "string" ? obj.tree_display_name : "",
  };
}
