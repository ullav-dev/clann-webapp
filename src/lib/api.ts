import type {
  Person,
  CreatePerson,
  UpdatePerson,
  RelationshipsResponse,
  AddRelationshipRequest,
  UpdateSpouseDatesRequest,
  FamilyTreeNode,
  FamilyTree,
  CreateFamilyTree,
  LifeEvent,
  CreateLifeEvent,
  UpdateLifeEvent,
  ResearchFolder,
  ResearchNote,
  CreateResearchNote,
  UpdateResearchNote,
  CreateNoteReply,
  ChatSession,
  CreateChatSession,
  ChatMessage,
} from "./types";

// In the browser, use relative paths so Next.js proxies to the backend (avoids CORS).
// On the server, fall back to the absolute URL.
const BASE_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://localhost:3000")
    : "";

// Module-level auth token — set once by AuthContext after login/restore.
// Safe for browser-only use (all API call sites are "use client" components).
let _apiToken: string | null = null;

/** Called by AuthContext to register the current JWT for all subsequent API requests. */
export function setApiToken(token: string | null): void {
  _apiToken = token;
}

/** Append ?created_by=<username> to a path when the caller supplies one. */
function withCreatedBy(path: string, createdBy?: string): string {
  if (!createdBy) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}created_by=${encodeURIComponent(createdBy)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    // Omit Content-Type for FormData — the browser must set it with the multipart boundary.
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers as Record<string, string>),
  };
  if (_apiToken) headers["Authorization"] = `Bearer ${_apiToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const contentType = res.headers.get("content-type") ?? "";
  const hasBody = contentType.includes("application/json");
  if (!hasBody) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return undefined as T;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// Family trees
export const listTrees = (owner?: string): Promise<FamilyTree[]> => {
  const qs = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return request(`/api/trees${qs}`);
};

export const createTree = (body: CreateFamilyTree): Promise<FamilyTree> =>
  request("/api/trees", { method: "POST", body: JSON.stringify(body) });

export const getTree = (name: string): Promise<FamilyTree> =>
  request(`/api/trees/${encodeURIComponent(name)}`);

export const deleteTree = (name: string): Promise<void> =>
  request(`/api/trees/${encodeURIComponent(name)}`, { method: "DELETE" });

export const updateTree = (name: string, body: { display_name: string }): Promise<FamilyTree> =>
  request(`/api/trees/${encodeURIComponent(name)}`, { method: "PATCH", body: JSON.stringify(body) });

export const setPrimaryTree = (name: string): Promise<FamilyTree> =>
  request(`/api/trees/${encodeURIComponent(name)}/set-primary`, { method: "PATCH" });

export const listTeamTrees = (teamId: string): Promise<FamilyTree[]> =>
  request(`/api/trees?team_id=${encodeURIComponent(teamId)}`);

export const setTreeTeam = (name: string, teamId: string | null): Promise<FamilyTree> =>
  request(`/api/trees/${encodeURIComponent(name)}/team`, {
    method: "PATCH",
    body: JSON.stringify({ team_id: teamId }),
  });

export async function uploadTreeImage(name: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("image", file);
  await request(`/api/trees/${encodeURIComponent(name)}/image`, { method: "POST", body: form });
}

/** URL that serves the tree's avatar image directly (proxied through Next.js). */
export function treeImageUrl(name: string): string {
  return `/api/trees/${encodeURIComponent(name)}/image`;
}

// Person CRUD
export const listPersons = (createdBy?: string, tree?: string): Promise<Person[]> => {
  const params = new URLSearchParams();
  if (createdBy) params.set("created_by", createdBy);
  if (tree) params.set("tree", tree);
  const qs = params.toString();
  return request(`/api/persons${qs ? `?${qs}` : ""}`);
};

export const createPerson = (body: CreatePerson): Promise<Person> =>
  request("/api/persons", { method: "POST", body: JSON.stringify(body) });

export const getPerson = (id: string, createdBy?: string): Promise<Person> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}`, createdBy));

export const updatePerson = (id: string, body: UpdatePerson, createdBy?: string): Promise<Person> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}`, createdBy), { method: "PUT", body: JSON.stringify(body) });

export const deletePerson = (id: string, createdBy?: string): Promise<void> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}`, createdBy), { method: "DELETE" });

export const addPersonToTree = (id: string, tree: string, createdBy?: string): Promise<void> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}/trees`, createdBy), {
    method: "POST",
    body: JSON.stringify({ tree }),
  });

export const removePersonFromTree = (id: string, treeName: string, createdBy?: string): Promise<void> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}/trees/${encodeURIComponent(treeName)}`, createdBy), {
    method: "DELETE",
  });

// Relationships
export const getRelationships = (id: string, createdBy?: string): Promise<RelationshipsResponse> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}/relationships`, createdBy));

export const addRelationship = (id: string, body: AddRelationshipRequest, createdBy?: string): Promise<void> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}/relationships`, createdBy), {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteRelationship = (
  id: string,
  relType: string,
  relatedId: string,
  createdBy?: string,
): Promise<void> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}/relationships/${relType}/${relatedId}`, createdBy), {
    method: "DELETE",
  });

// Spouse dates
export const updateSpouseDates = (
  id: string,
  relatedId: string,
  body: UpdateSpouseDatesRequest,
  createdBy?: string,
): Promise<void> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}/spouse-dates/${relatedId}`, createdBy), {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// Family tree
export const getFamilyTree = (id: string, createdBy?: string): Promise<FamilyTreeNode> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}/family-tree`, createdBy));

// Image
export async function uploadPersonImage(id: string, file: File, createdBy?: string): Promise<void> {
  const form = new FormData();
  form.append("image", file);
  const path = withCreatedBy(`/api/persons/${rawId(id)}/image`, createdBy);
  const headers: Record<string, string> = {};
  if (_apiToken) headers["Authorization"] = `Bearer ${_apiToken}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", body: form, headers });
  if (res.ok) return;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const data = await res.json();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  throw new Error(`HTTP ${res.status}`);
}

/** URL that serves the person's image directly (proxied through Next.js). */
export function personImageUrl(id: string): string {
  return `/api/persons/${rawId(id)}/image`;
}

export async function uploadPersonLifeImage(id: string, file: File, createdBy?: string): Promise<void> {
  const form = new FormData();
  form.append("image", file);
  const path = withCreatedBy(`/api/persons/${rawId(id)}/life-image`, createdBy);
  const headers: Record<string, string> = {};
  if (_apiToken) headers["Authorization"] = `Bearer ${_apiToken}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", body: form, headers });
  if (res.ok) return;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const data = await res.json();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  throw new Error(`HTTP ${res.status}`);
}

/** URL that serves the person's life story image directly (proxied through Next.js). */
export function personLifeImageUrl(id: string): string {
  return `/api/persons/${rawId(id)}/life-image`;
}

/** Strip the "person:" prefix the API stores, returning just the ULID part. */
export function rawId(id: string): string {
  return id.startsWith("person:") ? id.slice(7) : id;
}

/** Strip the "life_event:" prefix, returning just the ULID part. */
export function rawEventId(id: string): string {
  return id.startsWith("life_event:") ? id.slice(11) : id;
}

// Life Events
export const listLifeEvents = (personId: string, createdBy?: string): Promise<LifeEvent[]> =>
  request(withCreatedBy(`/api/persons/${rawId(personId)}/life-events`, createdBy));

export const createLifeEvent = (personId: string, body: CreateLifeEvent): Promise<LifeEvent> =>
  request(`/api/persons/${rawId(personId)}/life-events`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export async function createPersonWithBirthEvent(body: CreatePerson): Promise<Person> {
  const person = await createPerson(body);
  await createLifeEvent(rawId(person.id), {
    name: "Birth",
    event_type: "Birth",
    date: body.date_of_birth ?? null,
    created_by: body.created_by ?? undefined,
  });
  return person;
}

export const getLifeEvent = (eventId: string): Promise<LifeEvent> =>
  request(`/api/life-events/${rawEventId(eventId)}`);

export const updateLifeEvent = (eventId: string, body: UpdateLifeEvent): Promise<LifeEvent> =>
  request(`/api/life-events/${rawEventId(eventId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteLifeEvent = (eventId: string): Promise<void> =>
  request(`/api/life-events/${rawEventId(eventId)}`, { method: "DELETE" });

/** Strip the "research_note:" prefix, returning just the ULID part. */
export function rawNoteId(id: string): string {
  return id.startsWith("research_note:") ? id.slice(14) : id;
}

// Research Notes
export const listResearchNotes = (tree?: string, createdBy?: string): Promise<ResearchNote[]> => {
  const params = new URLSearchParams();
  if (tree) params.set("tree", tree);
  if (createdBy) params.set("created_by", createdBy);
  const qs = params.toString();
  return request(`/api/notes${qs ? `?${qs}` : ""}`);
};

export const createResearchNote = (body: CreateResearchNote): Promise<ResearchNote> =>
  request("/api/notes", { method: "POST", body: JSON.stringify(body) });

export const getResearchNote = (noteId: string): Promise<ResearchNote> =>
  request(`/api/notes/${rawNoteId(noteId)}`);

export const updateResearchNote = (noteId: string, body: UpdateResearchNote): Promise<ResearchNote> =>
  request(`/api/notes/${rawNoteId(noteId)}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteResearchNote = (noteId: string): Promise<void> =>
  request(`/api/notes/${rawNoteId(noteId)}`, { method: "DELETE" });

export const listNoteReplies = (noteId: string): Promise<ResearchNote[]> =>
  request(`/api/notes/${rawNoteId(noteId)}/replies`);

export const createNoteReply = (noteId: string, body: CreateNoteReply): Promise<ResearchNote> =>
  request(`/api/notes/${rawNoteId(noteId)}/replies`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const setNoteFolder = (noteId: string, folderId: string | null): Promise<ResearchNote> =>
  request(`/api/notes/${rawNoteId(noteId)}/folder`, {
    method: "PATCH",
    body: JSON.stringify({ folder_id: folderId }),
  });

// Research Folders
export function rawFolderId(id: string): string {
  return id.startsWith("research_folder:") ? id.slice(16) : id;
}

export const listFolders = (createdBy?: string): Promise<ResearchFolder[]> => {
  const qs = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : "";
  return request(`/api/folders${qs}`);
};

export const createFolder = (name: string, createdBy: string): Promise<ResearchFolder> =>
  request("/api/folders", { method: "POST", body: JSON.stringify({ name, created_by: createdBy }) });

export const renameFolder = (folderId: string, name: string): Promise<ResearchFolder> =>
  request(`/api/folders/${rawFolderId(folderId)}`, { method: "PATCH", body: JSON.stringify({ name }) });

export const deleteFolder = (folderId: string): Promise<void> =>
  request(`/api/folders/${rawFolderId(folderId)}`, { method: "DELETE" });

// Chat Sessions
export function rawSessionId(id: string): string {
  return id.startsWith("chat_session:") ? id.slice(13) : id;
}

export const listChatSessions = (createdBy?: string, tree?: string): Promise<ChatSession[]> => {
  const params = new URLSearchParams();
  if (createdBy) params.set("created_by", createdBy);
  if (tree) params.set("tree", tree);
  const qs = params.toString();
  return request(`/api/chat/sessions${qs ? `?${qs}` : ""}`);
};

export const createChatSession = (body: CreateChatSession): Promise<ChatSession> =>
  request("/api/chat/sessions", { method: "POST", body: JSON.stringify(body) });

export const deleteChatSession = (sessionId: string): Promise<void> =>
  request(`/api/chat/sessions/${rawSessionId(sessionId)}`, { method: "DELETE" });

export const listSessionMessages = (sessionId: string): Promise<ChatMessage[]> =>
  request(`/api/chat/sessions/${rawSessionId(sessionId)}/messages`);

export const appendSessionMessage = (
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> =>
  request(`/api/chat/sessions/${rawSessionId(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ role, content }),
  });
