"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import * as api from "@/lib/api";
import type {
  CreatePerson,
  UpdatePerson,
  AddRelationshipRequest,
  UpdateSpouseDatesRequest,
} from "@/lib/types";

/**
 * Returns typed API helpers pre-bound with the current user's `created_by`
 * and the active family tree so that every request automatically enforces
 * ownership and tree scoping on the backend.
 */
export function useApi() {
  const { user } = useAuth();
  const { activeTree } = useTree();
  const createdBy = user?.username;
  const tree = activeTree?.name;

  return {
    listPersons: () => api.listPersons(createdBy, tree),
    createPerson: (body: CreatePerson) =>
      api.createPerson({ ...body, created_by: createdBy, tree: tree ?? "" }),
    getPerson: (id: string) => api.getPerson(id, createdBy),
    updatePerson: (id: string, body: UpdatePerson) => api.updatePerson(id, body, createdBy),
    deletePerson: (id: string) => api.deletePerson(id, createdBy),
    getRelationships: (id: string) => api.getRelationships(id, createdBy),
    addRelationship: (id: string, body: AddRelationshipRequest) =>
      api.addRelationship(id, body, createdBy),
    deleteRelationship: (id: string, relType: string, relatedId: string) =>
      api.deleteRelationship(id, relType, relatedId, createdBy),
    updateSpouseDates: (id: string, relatedId: string, body: UpdateSpouseDatesRequest) =>
      api.updateSpouseDates(id, relatedId, body, createdBy),
    getFamilyTree: (id: string) => api.getFamilyTree(id, createdBy),
    uploadPersonImage: (id: string, file: File) => api.uploadPersonImage(id, file, createdBy),
    rawId: api.rawId,
    personImageUrl: api.personImageUrl,
  };
}
