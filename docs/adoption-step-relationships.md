# Adoption & Step-Relationships in Clann

## Principles

Clann records family relationships as they actually are, not as a simplified approximation. Two principles drive every decision here:

1. **One person, one record.** A person exists once in the tree regardless of how many family units they belong to. Duplicate entries for the same individual corrupt the graph and break genetic lineage — they must never be created as a workaround.

2. **Biological lineage is always preserved.** A person's genetic descent is a fact of nature and has lasting significance for health history, ancestry research, and the integrity of the record. If birth parents are known, they are recorded. An adoptive or step relationship is recorded *in addition*, not instead.

These two principles align with the GEDCOM genealogy standard (the authoritative data exchange specification), but more fundamentally they are just correct. Recording only the social family while erasing the biological one falsifies the historical record. Recording duplicates to "separate" the two families destroys graph integrity.

---

## The two core scenarios

### Fully adopted child

A child is born to one set of parents and raised by another. Both sets of parents matter:

- The **birth parents** are the genetic ancestors — they connect the child to earlier generations, to health history, and to any biological siblings.
- The **adoptive parents** are the legal and social family — they are the people the child grew up with, and their extended family is meaningfully connected to this person's life.

The child is one person in the tree. They have up to four parent connections: biological father, biological mother, adoptive father, adoptive mother. Each connection carries a **pedigree qualifier** that states the nature of the relationship. Siblings in the adoptive family are linked via `has_sibling`. Biological siblings (shared birth parents) are also linkable.

If birth parents are unknown — which is common in adoption — those connections simply do not exist yet. They can be added later if research reveals them. The adoptive connections stand alone in the meantime.

### Step-child

One biological parent is present; the other biological parent has been replaced in the household by a step-parent (usually after death or separation, followed by a new marriage). The step-parent is typically already in the tree as the spouse of the biological parent.

The child has:
- `has_father (birth)` → biological father
- `has_mother (birth)` → biological mother
- `has_father (step)` or `has_mother (step)` → step-parent

The step-parent is not a duplicate of the biological parent — they are a separate person with their own place in the tree. The child's link to them carries the `step` qualifier.

---

## Data model

### Pedigree qualifier

Parent-child edges (`has_father`, `has_mother`) gain a `pedigree` field:

```
pedigree: "birth" | "adopted" | "step" | "foster"
default: "birth"
```

This mirrors the GEDCOM `PEDI` tag and is consistent with how other edge-level qualifiers already work in Clann (`sibling_type` on `has_sibling`, `spouse_from/to` on `has_spouse`).

No new relationship types are needed. The qualifier rides on the existing edge.

### Multiple parents of the same sex

A person can now have more than one father or more than one mother — one biological, one adoptive or step. The server must allow this. The `has_father` and `has_mother` edges are a set, not a single slot.

### Half-siblings (derived, not stored)

Two people who share exactly one biological parent are half-siblings. This is derivable from the graph (inspect shared `has_father` / `has_mother` birth edges) and does not require a new sibling qualifier at this stage. It can be computed and displayed from existing data. Full-sibling vs half-sibling distinction can be added to `sibling_type` in a future iteration if needed.

---

## Changes required

### Backend (clann-server)

| Area | Change |
|---|---|
| `has_father` / `has_mother` SurrealDB edges | Add `pedigree` field; default `"birth"` on insert if omitted |
| `AddRelationshipRequest` | Add `pedigree?: Pedigree` (optional) |
| `RelationshipsResponse` | Include `pedigree` on each parent returned |
| `FamilyTreeNode` | Pass `pedigree` through on parent nodes |
| Relationship query handlers | Allow multiple `has_father` / `has_mother` edges per person (remove any uniqueness constraint if present) |
| GEDCOM export | Write `PEDI` tag on `FAMC` links |
| GEDCOM import | Read `PEDI` tag and map to `pedigree` |

### Frontend (clann-webapp)

| Area | Change |
|---|---|
| `src/lib/types.ts` | Add `Pedigree` type; add `pedigree` to `AddRelationshipRequest`, `RelationshipsResponse` parent entries |
| `AddRelationshipModal` | When type is Father or Mother, show a "Relationship type" selector: Biological (default) / Adopted / Step / Foster |
| Person detail → Relationships tab | Group parents by pedigree: biological and non-biological shown distinctly; label non-biological clearly |
| `FamilyTreeView` | Render non-biological parent edges as dashed; biological edges solid |
| `FamilyTreeView` node data | Pass `pedigree` through `FamilyTreeNode` → `NodeData` for edge styling |
| Help page | Add section explaining the model and the recommended workflow for adoptions and step-families |

---

## User guidance (workflow)

When a user needs to record an adoption or step-relationship, the process is:

**Fully adopted child:**
1. The child exists (or is created) as a single person in the tree.
2. Add Father → select adoptive father → set type to **Adopted**.
3. Add Mother → select adoptive mother → set type to **Adopted**.
4. If birth parents are known: Add Father → select birth father → type **Biological**. Repeat for birth mother.
5. Link to adoptive siblings via Add Sibling as normal.

**Step-child:**
1. The child exists as a single person.
2. The biological parents are already recorded (or add them with type **Biological**).
3. Add the step-parent: Add Father (or Mother) → select the step-parent → type **Step**.
4. The step-parent is usually already in the tree as the spouse of the biological parent — select that existing person, do not create a duplicate.

**Critical rule:** never create a second person record to represent the same individual in a different family context. If the person already exists in the tree, select them. Creating duplicates is the one mistake that cannot easily be recovered from.

---

## Visual conventions

| Relationship | Edge style | Badge |
|---|---|---|
| Biological | Solid line | none |
| Adopted | Dashed line | `A` |
| Step | Dotted line | `S` |
| Foster | Dashed + lighter colour | `F` |

These conventions should be documented in the help page and shown in a legend on the family tree view.
