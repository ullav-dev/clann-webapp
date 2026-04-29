export type Sex = "Male" | "Female";
export type RelationshipType = "Father" | "Mother" | "Sibling" | "Spouse";
export type SiblingType = "Brother" | "Sister";

export interface FamilyTree {
  id: string; // "family_tree:<ulid>"
  name: string; // unique slug e.g. "smith-family"
  display_name: string;
  owner: string; // username
  is_primary?: boolean;
  team_id?: string | null; // UUID of linked team, if any
}

// ── Team types (ullav-user-management) ────────────────────────────────────────

export interface TeamUserRef {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface TeamMember {
  id: string;
  user: TeamUserRef;
  status: "invited" | "active" | "inactive";
  role: "owner" | "leader" | "member";
  invited_at: string;
  joined_at: string | null;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  avatar_url: string | null;
  owner: TeamUserRef;
  leader: TeamUserRef;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner: TeamUserRef;
  leader: TeamUserRef;
  member_count: number;
  created_at: string;
  updated_at: string;
}

// ── Subscription types ─────────────────────────────────────────────────────────

export type ClannTier = "individual" | "family" | "professional" | "enterprise" | null;

export interface ClannSubscription {
  tier: ClannTier;
  status: string | null;
  isActive: boolean;
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

// Life Events
export type EventType =
  | "Birth"
  | "Death"
  | "Marriage"
  | "Divorce"
  | "Graduation"
  | "Immigration"
  | "Emigration"
  | "Military"
  | "Other"
  | string; // open to custom values

export interface LifeEvent {
  id: string; // "life_event:<ulid>"
  person_id: string; // "person:<ulid>"
  name: string;
  date?: string | null;
  event_type: EventType;
  description?: string | null;
  story?: string | null;
  verified?: boolean;
  source_link?: string | null;
  source_image?: string | null;
  source_doc?: string | null;
  created_by?: string | null;
}

export interface CreateLifeEvent {
  name: string;
  event_type: EventType;
  date?: string | null;
  description?: string | null;
  story?: string | null;
  verified?: boolean;
  source_link?: string | null;
  source_image?: string | null;
  source_doc?: string | null;
  created_by?: string | null;
}

export interface UpdateLifeEvent {
  name?: string | null;
  event_type?: EventType | null;
  date?: string | null;
  description?: string | null;
  story?: string | null;
  verified?: boolean | null;
  source_link?: string | null;
  source_image?: string | null;
  source_doc?: string | null;
}

// Research Folders
export interface ResearchFolder {
  id: string; // "research_folder:<ulid>"
  name: string;
  created_by: string;
  created_at?: string | null;
}

// Research Notes
export interface ResearchNote {
  id: string; // "research_note:<ulid>"
  title: string;
  description?: string | null;
  body?: string | null;
  trees: string[];
  folder_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateResearchNote {
  title: string;
  description?: string | null;
  body?: string | null;
  trees: string[];
  folder_id?: string | null;
  created_by?: string | null;
}

export interface UpdateResearchNote {
  title?: string | null;
  description?: string | null;
  body?: string | null;
  trees?: string[] | null;
}

// Chat Sessions
export interface ChatSession {
  id: string; // "chat_session:<ulid>"
  title: string;
  created_by: string;
  tree?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateChatSession {
  title: string;
  created_by: string;
  tree?: string | null;
}

export interface ChatMessage {
  id: string; // "chat_message:<ulid>"
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
}
