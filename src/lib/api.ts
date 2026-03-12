import type {
  Person,
  CreatePerson,
  UpdatePerson,
  RelationshipsResponse,
  AddRelationshipRequest,
  UpdateSpouseDatesRequest,
  FamilyTreeNode,
} from "./types";

// In the browser, use relative paths so Next.js proxies to the backend (avoids CORS).
// On the server, fall back to the absolute URL.
const BASE_URL =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000")
    : "";

/** Append ?created_by=<username> to a path when the caller supplies one. */
function withCreatedBy(path: string, createdBy?: string): string {
  if (!createdBy) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}created_by=${encodeURIComponent(createdBy)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const contentType = res.headers.get("content-type") ?? "";
  const hasBody = contentType.includes("application/json");
  if (!hasBody) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return undefined as T;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// Person CRUD
export const listPersons = (createdBy?: string): Promise<Person[]> =>
  request(withCreatedBy("/api/persons", createdBy));

export const createPerson = (body: CreatePerson): Promise<Person> =>
  request("/api/persons", { method: "POST", body: JSON.stringify(body) });

export const getPerson = (id: string, createdBy?: string): Promise<Person> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}`, createdBy));

export const updatePerson = (id: string, body: UpdatePerson, createdBy?: string): Promise<Person> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}`, createdBy), { method: "PUT", body: JSON.stringify(body) });

export const deletePerson = (id: string, createdBy?: string): Promise<void> =>
  request(withCreatedBy(`/api/persons/${rawId(id)}`, createdBy), { method: "DELETE" });

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
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: form,
  });
  if (res.status === 204) return;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
}

/** URL that serves the person's image directly (proxied through Next.js). */
export function personImageUrl(id: string): string {
  return `/api/persons/${rawId(id)}/image`;
}

/** Strip the "person:" prefix the API stores, returning just the ULID part. */
export function rawId(id: string): string {
  return id.startsWith("person:") ? id.slice(7) : id;
}
