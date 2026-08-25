"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import { useTeam } from "@/contexts/TeamContext";
import * as api from "@/lib/api";
import type {
  CreatePerson,
  UpdatePerson,
  AddRelationshipRequest,
  UpdateRelationshipRequest,
  UpdateSpouseDatesRequest,
} from "@/lib/types";

/**
 * Returns typed API helpers pre-bound with the current user's `created_by`
 * and the active family tree so that every request automatically enforces
 * ownership and tree scoping on the backend.
 *
 * For shared team trees (where activeTree.owner !== the logged-in user),
 * person read operations omit `created_by` so the backend uses JWT-based team
 * access instead of the ownership filter (which would return 404).
 * Write operations keep the logged-in user's username and are blocked in UI.
 *
 * Notes/folders are NOT part of this hook — see the comment at their
 * omission point below.
 */
export function useApi() {
  const { user } = useAuth();
  const { activeTree } = useTree();
  const { isEditorOf } = useTeam();
  const createdBy = user?.username;
  const tree = activeTree?.name;

  // True when the active tree is owned by someone else (a shared team tree).
  const isSharedTree = !!activeTree && !!user && activeTree.owner !== user.username;
  // Editors of a shared tree have full write access; plain viewers are read-only.
  const isReadOnly = isSharedTree && !isEditorOf(activeTree?.name ?? "");
  // For reads on a shared tree, omit created_by so the backend uses JWT auth.
  const readOwner = isSharedTree ? undefined : createdBy;

  return {
    isSharedTree,
    isReadOnly,
    listPersons: () => api.listPersons(readOwner, tree),
    createPerson: (body: CreatePerson) =>
      api.createPersonWithBirthEvent({ ...body, created_by: createdBy, tree: tree ?? "" }),
    getPerson: (id: string) => api.getPerson(id, readOwner),
    updatePerson: (id: string, body: UpdatePerson) => api.updatePerson(id, body, createdBy),
    deletePerson: (id: string) => api.deletePerson(id, createdBy),
    getRelationships: (id: string) => api.getRelationships(id, readOwner),
    addRelationship: (id: string, body: AddRelationshipRequest) =>
      api.addRelationship(id, body, createdBy),
    deleteRelationship: (id: string, relType: string, relatedId: string) =>
      api.deleteRelationship(id, relType, relatedId, createdBy),
    updateRelationshipPedigree: (id: string, relType: string, relatedId: string, body: UpdateRelationshipRequest) =>
      api.updateRelationshipPedigree(id, relType, relatedId, body, createdBy),
    updateSpouseDates: (id: string, relatedId: string, body: UpdateSpouseDatesRequest) =>
      api.updateSpouseDates(id, relatedId, body, createdBy),
    getFamilyTree: (id: string) => api.getFamilyTree(id, readOwner),
    addPersonToTree: (id: string, treeName: string) => api.addPersonToTree(id, treeName, createdBy),
    removePersonFromTree: (id: string, treeName: string) => api.removePersonFromTree(id, treeName, createdBy),
    uploadPersonImage: (id: string, file: File) => api.uploadPersonImage(id, file, createdBy),
    uploadPersonLifeImage: (id: string, file: File) => api.uploadPersonLifeImage(id, file, createdBy),
    rawId: api.rawId,
    personImageUrl: api.personImageUrl,
    personLifeImageUrl: api.personLifeImageUrl,
    // Notes/folders are NOT wrapped here — `ResearchNotesPanel`/
    // `tack-notes-adapter.ts` call `@/lib/api`'s note/folder functions
    // directly (same pattern the adapter already used pre-cutover), since
    // `TackNotesApi`'s own shape doesn't match this hook's per-call
    // created_by/tree-injection convention.
    listChatSessions: () => api.listChatSessions(createdBy, tree ?? undefined),
    createChatSession: (title: string) =>
      api.createChatSession({ title, created_by: createdBy ?? "", tree: tree ?? null }),
    deleteChatSession: (sessionId: string) => api.deleteChatSession(sessionId),
    listSessionMessages: (sessionId: string) => api.listSessionMessages(sessionId),
    appendSessionMessage: (sessionId: string, role: "user" | "assistant", content: string) =>
      api.appendSessionMessage(sessionId, role, content),
    rawSessionId: api.rawSessionId,
  };
}
