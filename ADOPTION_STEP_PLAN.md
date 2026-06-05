# Implementation Plan: Adoption & Step-Relationships

Design document: `docs/adoption-step-relationships.md`
Branch: `feat/adoption-step-relationships` (both repos)

---

## Phase 1 — Backend (clann-server)

### 1.1 Add `Pedigree` type

In `src/models/relationship.rs`, add:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Default, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Pedigree {
    #[default]
    Birth,
    Adopted,
    Step,
    Foster,
}
```

### 1.2 Extend `AddRelationshipRequest`

Add optional `pedigree: Option<Pedigree>` field. Applies only when `rel_type` is Father or Mother; ignored for Sibling and Spouse. Defaults to `Pedigree::Birth` on insert if absent.

### 1.3 Update SurrealDB edge writes

When inserting a `has_father` or `has_mother` edge, write the `pedigree` value. Example SurrealQL:

```surql
RELATE (person:$person_id)->has_father->(person:$related_id)
  SET pedigree = $pedigree;
```

Remove any `UNIQUE` constraint on these edges if one exists — a person must be able to have both a birth father and an adoptive father simultaneously.

### 1.4 Update read queries

`GET /api/persons/{id}/relationships` — include `pedigree` in the returned parent objects.

`GET /api/persons/{id}/family-tree` — pass `pedigree` through on `FamilyTreeNode` father/mother fields.

### 1.5 Update `RelationshipsResponse` and `FamilyTreeNode`

`RelationshipsResponse.father` and `.mother` change from `Vec<Person>` to `Vec<ParentInfo>` where:

```rust
pub struct ParentInfo {
    #[serde(flatten)]
    pub person: Person,
    pub pedigree: Pedigree,
}
```

`FamilyTreeNode` gains `pedigree: Option<Pedigree>` (populated when the node is a father or mother of the root).

### 1.6 GEDCOM export

In the GEDCOM export handler, for each `has_father` / `has_mother` edge, write a `PEDI` subrecord under the `FAMC` link:

```
1 FAMC @F1@
2 PEDI adopted
```

Map: `birth` → `birth`, `adopted` → `adopted`, `step` → `step`, `foster` → `foster`.

### 1.7 GEDCOM import

In `src/lib/gedcom-import.ts` (webapp), read the `PEDI` tag from `FAMC` blocks and map it to `pedigree` in the `AddRelationshipRequest`. Default to `birth` if absent.

---

## Phase 2 — Frontend (clann-webapp)

### 2.1 Types (`src/lib/types.ts`)

```typescript
export type Pedigree = "birth" | "adopted" | "step" | "foster";

export interface ParentInfo extends Person {
  pedigree: Pedigree;
}
```

Update `RelationshipsResponse`:
```typescript
father: ParentInfo[];
mother: ParentInfo[];
```

Update `AddRelationshipRequest`:
```typescript
pedigree?: Pedigree;
```

Update `FamilyTreeNode`:
```typescript
pedigree?: Pedigree;
```

### 2.2 `AddRelationshipModal`

When `type === "Father"` or `type === "Mother"`, show a segmented control or dropdown below the person picker:

```
Relationship type:  ● Biological  ○ Adopted  ○ Step  ○ Foster
```

Default: Biological. Include this value in the submitted `AddRelationshipRequest`.

UI note: for the person picker sex filter, keep it: Father/Adopted Father/Step Father all pick from males; Mother variants from females.

### 2.3 Relationships tab

Currently parents are listed flatly. Group them:

- If all parents are `birth` → no change in presentation (no unnecessary UI noise for the common case)
- If any non-birth parent exists → show a label per parent: `(biological)`, `(adopted)`, `(step)`, `(foster)`

Use a muted badge rather than a heavy label so the name remains dominant.

### 2.4 `FamilyTreeView` — edge styling

`buildGraph` passes `pedigree` from `FamilyTreeNode` into each edge's `data`. In the React Flow edge renderer (or via `edgeStyle`), apply:

| Pedigree | Style |
|---|---|
| `birth` | solid line (current default) |
| `adopted` | dashed (`strokeDasharray: "6 3"`) |
| `step` | dotted (`strokeDasharray: "2 4"`) |
| `foster` | long-dash lighter (`strokeDasharray: "8 4"`, opacity 0.7) |

Add a small legend to the tree toolbar (collapsible, only visible when the tree contains at least one non-birth edge) explaining the line styles.

### 2.5 Help page

Add a new section **"Recording adoptions and step-families"** covering:
- The one-person rule
- How to add adoptive and biological parents
- How step-parents appear in the tree
- The visual conventions (line styles)

---

## Phase 3 — Translation strings

Add keys to `messages/{en,de,ga}.json`:

```
addRelationship.pedigree            = "Relationship type"
addRelationship.pedigree_birth      = "Biological"
addRelationship.pedigree_adopted    = "Adopted"
addRelationship.pedigree_step       = "Step"
addRelationship.pedigree_foster     = "Foster"
personDetail.parentPedigree_adopted = "adopted"
personDetail.parentPedigree_step    = "step"
personDetail.parentPedigree_foster  = "foster"
familyTree.legend_birth             = "Biological"
familyTree.legend_adopted           = "Adopted"
familyTree.legend_step              = "Step"
familyTree.legend_foster            = "Foster"
```

---

## Sequencing

```
Phase 1 (server) → Phase 2 (webapp) → Phase 3 (i18n)
```

Server first because the webapp changes depend on the new API shape. Phases 2 and 3 can be done together.

The existing data is unaffected — all current `has_father` / `has_mother` edges will read as `birth` (either via database default or via a one-time migration that sets `pedigree = "birth"` on all existing edges).

---

## Migration note

Existing edges need `pedigree = "birth"` set. This can be done as a SurrealDB migration:

```surql
UPDATE has_father SET pedigree = "birth" WHERE pedigree = NONE;
UPDATE has_mother SET pedigree = "birth" WHERE pedigree = NONE;
```

Run once on deploy after Phase 1 goes live.
