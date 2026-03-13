"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PersonForm from "@/components/PersonForm";
import { createPerson, rawId } from "@/lib/api";
import type { CreatePerson } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function NewPersonPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const t = useTranslations("newPerson");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  async function handleSubmit(values: CreatePerson) {
    const person = await createPerson({ ...values, created_by: user!.username });
    router.push(`/persons/${rawId(person.id)}`);
  }

  if (isLoading || !user) return null;

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
