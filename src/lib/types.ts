export type Sex = "Male" | "Female";
export type RelationshipType = "Father" | "Mother" | "Sibling" | "Spouse";
export type SiblingType = "Brother" | "Sister";

export interface FamilyTree {
  id: string; // "family_tree:<ulid>"
  name: string; // unique slug e.g. "smith-family"
  display_name: string;
  owner: string; // username
  is_primary?: boolean;
}

export interface CreateFamilyTree {
  name: string;
  display_name: string;
  owner: string;
  is_primary?: boolean;
}

export interface Person {
  id: string; // e.g. "person:01jd4a8xyz"
  family_name: string;
  first_name: string;
  sex: Sex;
  middle_name?: string | null;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  place_of_birth?: string | null;
  place_of_death?: string | null;
  image_path?: string | null;
  life_image_path?: string | null;
  nickname?: string | null;
  username?: string | null;
  email?: string | null;
  verified?: boolean;
  biography?: string | null;
  created_by?: string | null;
  trees?: string[];
}

export interface CreatePerson {
  family_name: string;
  first_name: string;
  sex: Sex;
  middle_name?: string | null;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  place_of_birth?: string | null;
  place_of_death?: string | null;
  nickname?: string | null;
  username?: string | null;
  email?: string | null;
  verified?: boolean;
  biography?: string | null;
  created_by?: string | null;
  /** Tree names (slugs). Required by the API; injected automatically by useApi. */
  trees?: string[];
}

export interface UpdatePerson {
  family_name?: string | null;
  first_name?: string | null;
  sex?: Sex | null;
  middle_name?: string | null;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  place_of_birth?: string | null;
  place_of_death?: string | null;
  nickname?: string | null;
  username?: string | null;
  email?: string | null;
  verified?: boolean | null;
  biography?: string | null;
}

/** A Person with spouse-relationship date attributes from the edge. */
export interface SpouseInfo extends Person {
  spouse_from?: string | null;
  spouse_to?: string | null;
}

export interface RelationshipsResponse {
  father: Person[];
  mother: Person[];
  siblings: Person[];
  spouse: SpouseInfo[];
}

export interface AddRelationshipRequest {
  type: RelationshipType;
  related_id: string; // full record ID e.g. "person:01jd4a8xyz"
  sibling_type?: SiblingType | null;
  spouse_from?: string | null;
  spouse_to?: string | null;
}

export interface UpdateSpouseDatesRequest {
  spouse_from?: string | null;
  spouse_to?: string | null;
}

export interface FamilyTreeNode {
  id: string;
  family_name: string;
  first_name: string;
  sex?: Sex;
  date_of_birth?: string | null;
  place_of_birth?: string | null;
  biography?: string | null;
  image_path?: string | null;
  sibling_type?: SiblingType | null;
  father?: FamilyTreeNode[];
  mother?: FamilyTreeNode[];
  children?: FamilyTreeNode[];
  spouse?: FamilyTreeNode[];
  siblings?: FamilyTreeNode[];
}

export interface ErrorResponse {
  error: string;
}
