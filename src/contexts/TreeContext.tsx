"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as api from "@/lib/api";
import type { FamilyTree } from "@/lib/types";

interface TreeState {
  trees: FamilyTree[];
  activeTree: FamilyTree | null;
  isLoading: boolean;
  initError: string | null;
  setActiveTree: (tree: FamilyTree) => void;
  createTree: (name: string, displayName: string, options?: { select?: boolean }) => Promise<FamilyTree>;
  renameTree: (name: string, displayName: string) => Promise<void>;
  deleteTree: (name: string) => Promise<void>;
  setPrimaryTree: (name: string) => Promise<void>;
  refreshTree: (name: string) => Promise<void>;
}

const TreeContext = createContext<TreeState>({
  trees: [],
  activeTree: null,
  isLoading: true,
  initError: null,
  setActiveTree: () => {},
  createTree: async () => { throw new Error("TreeProvider not mounted"); },
  renameTree: async () => { throw new Error("TreeProvider not mounted"); },
  deleteTree: async () => { throw new Error("TreeProvider not mounted"); },
  setPrimaryTree: async () => { throw new Error("TreeProvider not mounted"); },
  refreshTree: async () => { throw new Error("TreeProvider not mounted"); },
});

const STORAGE_KEY = "clann_active_tree";

export function TreeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [activeTree, setActiveTreeState] = useState<FamilyTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrees([]);
      setActiveTreeState(null);
      localStorage.removeItem(STORAGE_KEY);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api.listTrees(user.username)
      .then(async (loaded) => {
        // Auto-create the first tree for a brand-new user.
        if (loaded.length === 0) {
          const raw = localStorage.getItem("clann_pending_tree");
          // Parse pending registration data when available (same-device verification).
          // Fall back to auth-service user fields for cross-device verification.
          const pending = raw
            ? (JSON.parse(raw) as { firstName?: string; surname: string; familyWord: string; email: string; sex: "Male" | "Female" })
            : null;
          // Prefer registration form data; fall back to auth-service fields; last resort: username.
          const firstName = pending?.firstName || user.first_name || user.username;
          const lastName = pending?.surname || user.last_name || user.username;
          try {
            const slug = user.username.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const displayName = pending ? `${pending.surname} ${pending.familyWord}` : `${lastName} Family`;
            const tree = await api.createTree({
              name: `${slug}-family`,
              display_name: displayName,
              owner: user.username,
              is_primary: true,
            });

            // Check whether a person with this username already exists in the system
            // before attempting to create a duplicate (which would return a 500).
            const allPersons = await api.listPersons();
            const existingPerson = allPersons.find((p) => p.username === user.username);

            if (existingPerson) {
              if (existingPerson.created_by === user.username) {
                // Person belongs to this user (e.g. partial previous registration) — just
                // add them to the new tree instead of creating a duplicate.
                await api.addPersonToTree(existingPerson.id, tree.name, user.username);
              } else {
                // Person is owned by a different account — we cannot link or duplicate it.
                setInitError(
                  `A family member with the username "${user.username}" already exists in the system. ` +
                  `Please contact an administrator to resolve this.`
                );
              }
            } else {
              await api.createPersonWithBirthEvent({
                first_name: firstName,
                family_name: lastName,
                sex: pending?.sex || "Male",
                username: user.username,
                email: pending?.email || user.email,
                created_by: user.username,
                tree: tree.name,
              });
            }

            if (raw) localStorage.removeItem("clann_pending_tree");
            setTrees([tree]);
            setActiveTreeState(tree);
            localStorage.setItem(STORAGE_KEY, tree.name);
            return;
          } catch (err) {
            console.error("[TreeContext] Failed to auto-create initial tree/person:", err);
            if (raw) localStorage.removeItem("clann_pending_tree");
          }
        }
        setTrees(loaded);
        const savedName = localStorage.getItem(STORAGE_KEY);
        const saved = loaded.find((t) => t.name === savedName);
        const primary = loaded.find((t) => t.is_primary);
        const selected = saved ?? primary ?? loaded[0] ?? null;
        setActiveTreeState(selected);
        if (selected) localStorage.setItem(STORAGE_KEY, selected.name);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const setActiveTree = useCallback((tree: FamilyTree) => {
    setActiveTreeState(tree);
    localStorage.setItem(STORAGE_KEY, tree.name);
  }, []);

  const createTree = useCallback(async (name: string, displayName: string, options?: { select?: boolean }): Promise<FamilyTree> => {
    // First tree created by this user becomes the primary tree
    const isPrimary = trees.length === 0;
    const tree = await api.createTree({
      name,
      display_name: displayName,
      owner: user!.username,
      is_primary: isPrimary || undefined,
    });
    setTrees((prev) => {
      const updated = isPrimary ? prev.map((t) => ({ ...t, is_primary: false })) : prev;
      return [...updated, tree];
    });
    // Auto-select unless caller explicitly opts out (e.g. during bulk import to avoid
    // triggering background re-fetches that can cause concurrent SurrealDB queries)
    if (options?.select !== false) {
      setActiveTreeState(tree);
      localStorage.setItem(STORAGE_KEY, tree.name);
    }
    return tree;
  }, [user, trees.length]);

  const deleteTree = useCallback(async (name: string): Promise<void> => {
    await api.deleteTree(name);
    setTrees((prev) => {
      const next = prev.filter((t) => t.name !== name);
      if (activeTree?.name === name) {
        const fallback = next.find((t) => t.is_primary) ?? next[0] ?? null;
        setActiveTreeState(fallback);
        if (fallback) {
          localStorage.setItem(STORAGE_KEY, fallback.name);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      return next;
    });
  }, [activeTree]);

  const renameTree = useCallback(async (name: string, displayName: string): Promise<void> => {
    const updated = await api.updateTree(name, { display_name: displayName });
    setTrees((prev) => prev.map((t) => t.name === name ? { ...t, display_name: updated.display_name } : t));
    if (activeTree?.name === name) {
      setActiveTreeState((prev) => prev ? { ...prev, display_name: updated.display_name } : prev);
    }
  }, [activeTree]);

  const setPrimaryTree = useCallback(async (name: string): Promise<void> => {
    const updated = await api.setPrimaryTree(name);
    setTrees((prev) =>
      prev.map((t) => ({ ...t, is_primary: t.name === updated.name }))
    );
  }, []);

  const refreshTree = useCallback(async (name: string): Promise<void> => {
    const updated = await api.getTree(name);
    setTrees((prev) => prev.map((t) => t.name === name ? updated : t));
    if (activeTree?.name === name) {
      setActiveTreeState(updated);
    }
  }, [activeTree]);

  return (
    <TreeContext.Provider value={{ trees, activeTree, isLoading, initError, setActiveTree, createTree, renameTree, deleteTree, setPrimaryTree, refreshTree }}>
      {children}
    </TreeContext.Provider>
  );
}

export function useTree() {
  return useContext(TreeContext);
}
