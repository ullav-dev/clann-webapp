"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getSubscription, type SubscriptionInfo } from "@/lib/auth-api";

// ── Plan limit table ──────────────────────────────────────────────────────────

export type DamAccess = "none" | "images" | "full";

interface PlanSpec {
  maxTrees: number;   // Infinity = unlimited
  maxMembers: number; // Infinity = unlimited; global across all trees
  maxNotes: number;   // Infinity = unlimited; global across all trees
  dam: DamAccess;
}

const PLAN_LIMITS: Record<string, PlanSpec> = {
  individual:   { maxTrees: 2,        maxMembers: 1_000,    maxNotes: 50,       dam: "images" },
  family:       { maxTrees: 10,       maxMembers: 10_000,   maxNotes: 1_000,    dam: "images" },
  professional: { maxTrees: Infinity, maxMembers: Infinity, maxNotes: Infinity, dam: "full" },
  enterprise:   { maxTrees: Infinity, maxMembers: Infinity, maxNotes: Infinity, dam: "full" },
};

const FREE_SPEC: PlanSpec = PLAN_LIMITS.individual;

// ── Context shape ─────────────────────────────────────────────────────────────

export interface SubscriptionState {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  /** Maximum number of family trees allowed by the current plan. */
  maxTrees: number;
  /** Maximum number of family members (persons) allowed by the current plan, across all trees. */
  maxMembers: number;
  /** Maximum number of research notes allowed by the current plan, across all trees. */
  maxNotes: number;
  /** DAM access level for the current plan. */
  dam: DamAccess;
  /** True when the user has reached or exceeded their tree limit. */
  atTreeLimit: (treeCount: number) => boolean;
  /** True when the user has reached or exceeded their member limit. */
  atMemberLimit: (memberCount: number) => boolean;
  /** True when the user has reached or exceeded their note limit. */
  atNoteLimit: (noteCount: number) => boolean;
  /** True when the user can use the DAM at all. */
  canUseDam: boolean;
  /** True when the user has full (unrestricted) DAM access. */
  hasFullDam: boolean;
}

const SubscriptionContext = createContext<SubscriptionState>({
  subscription: null,
  isLoading: true,
  maxTrees: FREE_SPEC.maxTrees,
  maxMembers: FREE_SPEC.maxMembers,
  maxNotes: FREE_SPEC.maxNotes,
  dam: FREE_SPEC.dam,
  atTreeLimit: () => false,
  atMemberLimit: () => false,
  atNoteLimit: () => false,
  canUseDam: false,
  hasFullDam: false,
});

// ── Provider ──────────────────────────────────────────────────────────────────

const ADMIN_SPEC: PlanSpec = { maxTrees: Infinity, maxMembers: Infinity, maxNotes: Infinity, dam: "full" };

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { token, roles } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (!token || isAdmin) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getSubscription("clann", token)
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setIsLoading(false));
  }, [token, isAdmin]);

  const spec = isAdmin
    ? ADMIN_SPEC
    : subscription
    ? (PLAN_LIMITS[subscription.plan] ?? FREE_SPEC)
    : FREE_SPEC;

  const value: SubscriptionState = {
    subscription,
    isLoading,
    maxTrees: spec.maxTrees,
    maxMembers: spec.maxMembers,
    maxNotes: spec.maxNotes,
    dam: spec.dam,
    atTreeLimit: (count) => count >= spec.maxTrees,
    atMemberLimit: (count) => count >= spec.maxMembers,
    atNoteLimit: (count) => count >= spec.maxNotes,
    canUseDam: spec.dam !== "none",
    hasFullDam: spec.dam === "full",
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
