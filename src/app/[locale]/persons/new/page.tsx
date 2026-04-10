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

  async function handleSubmit(values: CreatePerson) {
    const person = await apiHook.createPerson(values);
    router.push(`/persons/${apiHook.rawId(person.id)}`);
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
        <PersonForm onSubmit={handleSubmit} submitLabel={t("submitLabel")} />
      </div>
    </div>
  );
}
