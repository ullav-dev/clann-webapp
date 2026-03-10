export type Sex = "Male" | "Female";
export type RelationshipType = "Father" | "Mother" | "Sibling";
export type SiblingType = "Brother" | "Sister";

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
}

export interface RelationshipsResponse {
  father: Person[];
  mother: Person[];
  siblings: Person[];
}

export interface AddRelationshipRequest {
  type: RelationshipType;
  related_id: string; // full record ID e.g. "person:01jd4a8xyz"
  sibling_type?: SiblingType | null;
}

export interface FamilyTreeNode {
  id: string;
  family_name: string;
  first_name: string;
  sex?: Sex;
  image_path?: string | null;
  father?: FamilyTreeNode[];
  mother?: FamilyTreeNode[];
  children?: FamilyTreeNode[];
}

export interface ErrorResponse {
  error: string;
}
