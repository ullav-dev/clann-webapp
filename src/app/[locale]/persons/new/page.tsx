"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PersonForm from "@/components/PersonForm";
import { useApi } from "@/hooks/useApi";
import type { CreatePerson } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";
import * as api from "@/lib/api";

export default function NewPersonPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { activeTree, isLoading: treeLoading } = useTree();
  const { atMemberLimit, isLoading: subLoading } = useSubscription();
  const apiHook = useApi();
  const t = useTranslations("newPerson");
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Fetch current member count to check limit before rendering the form.
  useEffect(() => {
    if (!user || !activeTree) return;
    api.listPersons()
      .then((people) => setMemberCount(people.length))
      .catch(() => setMemberCount(null));
  }, [user, activeTree]);

  async function handleSubmit(values: CreatePerson & { _fatherId?: string; _motherId?: string; _inheritSiblings?: boolean }) {
    const { _fatherId, _motherId, _inheritSiblings, ...personValues } = values;
    const person = await apiHook.createPerson(personValues);
    const personRawId = apiHook.rawId(person.id);
    const createdBy = user?.username ?? null;
    const eventPromises = [];
    if (personValues.date_of_birth) {
      eventPromises.push(
        api.createLifeEvent(person.id, {
          name: "Birth",
          event_type: "Birth",
          date: personValues.date_of_birth,
          created_by: createdBy,
        })
      );
    }
    if (personValues.date_of_death) {
      eventPromises.push(
        api.createLifeEvent(person.id, {
          name: "Death",
          event_type: "Death",
          date: personValues.date_of_death,
          created_by: createdBy,
        })
      );
    }
    await Promise.all(eventPromises);

    // Link parent relationships and optionally inherit siblings from each parent.
    // linkedSiblingIds tracks siblings already added so duplicates (children of
    // both parents) are linked only once.
    const linkedSiblingIds = new Set<string>();

    async function inheritFromParent(parentId: string) {
      const parentTree = await apiHook.getFamilyTree(parentId);
      for (const child of parentTree.children ?? []) {
        const childRawId = apiHook.rawId(child.id);
        if (childRawId === personRawId) continue;
        if (linkedSiblingIds.has(childRawId)) continue;
        linkedSiblingIds.add(childRawId);
        const siblingType = child.sex === "Female" ? "Sister" : "Brother";
        await apiHook.addRelationship(personRawId, {
          type: "Sibling",
          related_id: child.id,
          sibling_type: siblingType,
          pedigree: "birth",
        });
      }
    }

    if (_fatherId) {
      await apiHook.addRelationship(personRawId, { type: "Father", related_id: _fatherId });
      if (_inheritSiblings) await inheritFromParent(_fatherId);
    }
    if (_motherId) {
      await apiHook.addRelationship(personRawId, { type: "Mother", related_id: _motherId });
      if (_inheritSiblings) await inheritFromParent(_motherId);
    }

    router.push(`/persons/${personRawId}`);
  }

  if (authLoading || treeLoading || subLoading || !user) return null;

  if (!activeTree) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 text-stone-400">
        <div className="text-5xl mb-4">🌳</div>
        <p className="text-stone-600 font-medium">{t("noTree")}</p>
      </div>
    );
  }

  // Block form if member count is known and at limit.
  if (memberCount !== null && atMemberLimit(memberCount)) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800">{t("title")}</h1>
        </div>
        <UpgradePrompt titleKey="memberLimitTitle" messageKey="memberLimitMessage" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">{t("title")}</h1>
        <p className="text-stone-500 mt-1">{t("subtitle")}</p>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <PersonForm onSubmit={handleSubmit} submitLabel={t("submitLabel")} showParentSelectors />
      </div>
    </div>
  );
}
