"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as api from "@/lib/api";
import type { FamilyTree } from "@/lib/types";

interface TreeState {
  trees: FamilyTree[];
  activeTree: FamilyTree | null;
  isLoading: boolean;
  setActiveTree: (tree: FamilyTree) => void;
  createTree: (name: string, displayName: string, options?: { select?: boolean }) => Promise<FamilyTree>;
  deleteTree: (name: string) => Promise<void>;
  setPrimaryTree: (name: string) => Promise<void>;
}

const TreeContext = createContext<TreeState>({
  trees: [],
  activeTree: null,
  isLoading: true,
  setActiveTree: () => {},
  createTree: async () => { throw new Error("TreeProvider not mounted"); },
  deleteTree: async () => { throw new Error("TreeProvider not mounted"); },
  setPrimaryTree: async () => { throw new Error("TreeProvider not mounted"); },
});

const STORAGE_KEY = "clann_active_tree";

export function TreeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [activeTree, setActiveTreeState] = useState<FamilyTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      .then((loaded) => {
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

  const setPrimaryTree = useCallback(async (name: string): Promise<void> => {
    const updated = await api.setPrimaryTree(name);
    setTrees((prev) =>
      prev.map((t) => ({ ...t, is_primary: t.name === updated.name }))
    );
  }, []);

  return (
    <TreeContext.Provider value={{ trees, activeTree, isLoading, setActiveTree, createTree, deleteTree, setPrimaryTree }}>
      {children}
    </TreeContext.Provider>
  );
}

export function useTree() {
  return useContext(TreeContext);
}
