"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { rawId, createLifeEvent } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Person, RelationshipsResponse, SiblingType } from "@/lib/types";
import { fullName } from "@/components/PersonCard";

interface Props {
  person: Person;
  existingRels: RelationshipsResponse;
  onDone: () => void;
  onClose: () => void;
}

export default function SetupFamilyModal({ person, existingRels, onDone, onClose }: Props) {
  const api = useApi();
  const { user } = useAuth();
  const hasExistingFather = existingRels.father.length > 0;
  const hasExistingMother = existingRels.mother.length > 0;

  const [includeFather, setIncludeFather] = useState(!hasExistingFather);
  const [includeMother, setIncludeMother] = useState(!hasExistingMother);
  const [married, setMarried] = useState(true);
  const [brotherCount, setBrotherCount] = useState(0);
  const [sisterCount, setSisterCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const lastName = person.family_name;
  const personRawId = rawId(person.id);

  const totalToCreate =
    (includeFather ? 1 : 0) + (includeMother ? 1 : 0) + brotherCount + sisterCount;

  async function handleSetup() {
    setRunning(true);
    try {
      const existingFatherId: string | null = existingRels.father[0]?.id ?? null;
      const existingMotherId: string | null = existingRels.mother[0]?.id ?? null;

      // Create father
      let newFatherId: string | null = null;
      if (includeFather) {
        setProgress("Creating father…");
        const father = await api.createPerson({ first_name: "Father", family_name: lastName, sex: "Male" });
        newFatherId = father.id;
        await api.addRelationship(personRawId, { type: "Father", related_id: newFatherId });
      }

      // Create mother
      let newMotherId: string | null = null;
      if (includeMother) {
        setProgress("Creating mother…");
        const mother = await api.createPerson({ first_name: "Mother", family_name: lastName, sex: "Female" });
        newMotherId = mother.id;
        await api.addRelationship(personRawId, { type: "Mother", related_id: newMotherId });
      }

      // Effective parents used for sibling linking (new or existing)
      const effectiveFatherId = newFatherId ?? existingFatherId;
      const effectiveMotherId = newMotherId ?? existingMotherId;

      // Link parents as spouses and add Marriage life events for each
      if (married && effectiveFatherId && effectiveMotherId) {
        setProgress("Linking parents as spouses…");
        // Backend adds spouse bidirectionally — one call is enough
        await api.addRelationship(rawId(effectiveFatherId), {
          type: "Spouse",
          related_id: effectiveMotherId,
        });
        setProgress("Adding marriage life events…");
        const createdBy = user?.username ?? undefined;
        await createLifeEvent(rawId(effectiveFatherId), { name: "Marriage", event_type: "Marriage", created_by: createdBy });
        await createLifeEvent(rawId(effectiveMotherId), { name: "Marriage", event_type: "Marriage", created_by: createdBy });
      }

      // Create brothers then sisters
      const newSiblings: { id: string; siblingType: SiblingType }[] = [];

      for (let i = 1; i <= brotherCount; i++) {
        setProgress(`Creating brother ${i} of ${brotherCount}…`);
        const brother = await api.createPerson({ first_name: `Brother ${i}`, family_name: lastName, sex: "Male" });
        newSiblings.push({ id: brother.id, siblingType: "Brother" });
      }

      for (let i = 1; i <= sisterCount; i++) {
        setProgress(`Creating sister ${i} of ${sisterCount}…`);
        const sister = await api.createPerson({ first_name: `Sister ${i}`, family_name: lastName, sex: "Female" });
        newSiblings.push({ id: sister.id, siblingType: "Sister" });
      }

      // Wire up each new sibling
      for (const sib of newSiblings) {
        setProgress(`Linking ${sib.siblingType.toLowerCase()}…`);
        const sibRawId = rawId(sib.id);

        // Target person ↔ new sibling
        await api.addRelationship(personRawId, { type: "Sibling", related_id: sib.id, sibling_type: sib.siblingType });

        // New sibling → effective parents (same as target person's parents)
        if (effectiveFatherId) {
          await api.addRelationship(sibRawId, { type: "Father", related_id: effectiveFatherId });
        }
        if (effectiveMotherId) {
          await api.addRelationship(sibRawId, { type: "Mother", related_id: effectiveMotherId });
        }

        // New sibling ↔ any already-existing siblings of the target person
        for (const existSib of existingRels.siblings) {
          const existSibType: SiblingType = existSib.sex === "Male" ? "Brother" : "Sister";
          await api.addRelationship(sibRawId, {
            type: "Sibling",
            related_id: existSib.id,
            sibling_type: existSibType,
          });
        }
      }

      // Link new siblings to each other (upper triangle — backend queries bidirectionally)
      for (let i = 0; i < newSiblings.length; i++) {
        for (let j = i + 1; j < newSiblings.length; j++) {
          await api.addRelationship(rawId(newSiblings[i].id), {
            type: "Sibling",
            related_id: newSiblings[j].id,
            sibling_type: newSiblings[j].siblingType,
          });
        }
      }

      onDone();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Setup failed. Some members may have been created — check the family list.");
      setRunning(false);
      setProgress(null);
    }
  }

  const willCreateList: string[] = [];
  if (includeFather) willCreateList.push(`Father ${lastName}`);
  if (includeMother) willCreateList.push(`Mother ${lastName}`);
  for (let i = 1; i <= brotherCount; i++) willCreateList.push(`Brother ${i} ${lastName}`);
  for (let i = 1; i <= sisterCount; i++) willCreateList.push(`Sister ${i} ${lastName}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-800">Setup Family</h2>
          <button
            onClick={onClose}
            disabled={running}
            className="text-stone-400 hover:text-stone-600 text-2xl leading-none disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-stone-500">
            Create placeholder family members for{" "}
            <span className="font-medium text-stone-700">{fullName(person)}</span> and wire up all
            relationships automatically.
          </p>

          {/* Parents */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Parents</p>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFather}
                onChange={(e) => setIncludeFather(e.target.checked)}
                disabled={running}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-stone-700">
                Add Father
                {hasExistingFather && (
                  <span className="ml-2 text-xs text-amber-600 font-medium">
                    (already linked — unchecked by default)
                  </span>
                )}
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMother}
                onChange={(e) => setIncludeMother(e.target.checked)}
                disabled={running}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-stone-700">
                Add Mother
                {hasExistingMother && (
                  <span className="ml-2 text-xs text-amber-600 font-medium">
                    (already linked — unchecked by default)
                  </span>
                )}
              </span>
            </label>
            {(includeFather || hasExistingFather) && (includeMother || hasExistingMother) && (
              <label className="flex items-center gap-3 cursor-pointer select-none pl-1">
                <input
                  type="checkbox"
                  checked={married}
                  onChange={(e) => setMarried(e.target.checked)}
                  disabled={running}
                  className="rounded border-stone-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-stone-700">
                  Married{" "}
                  <span className="text-xs text-stone-400">(adds Spouse link + Marriage life events for both)</span>
                </span>
              </label>
            )}
          </div>

          {/* Siblings */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Siblings</p>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3">
                <span className="text-sm text-stone-700 w-16 shrink-0">Brothers</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={brotherCount}
                  onChange={(e) => setBrotherCount(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={running}
                  className="w-16 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="flex items-center gap-3">
                <span className="text-sm text-stone-700 w-16 shrink-0">Sisters</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={sisterCount}
                  onChange={(e) => setSisterCount(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={running}
                  className="w-16 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>
            </div>
            {existingRels.siblings.length > 0 && (brotherCount > 0 || sisterCount > 0) && (
              <p className="text-xs text-stone-400">
                New siblings will also be linked to {existingRels.siblings.length} existing sibling
                {existingRels.siblings.length !== 1 ? "s" : ""}.
              </p>
            )}
          </div>

          {/* Preview */}
          {willCreateList.length > 0 && (
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <p className="text-xs font-medium text-stone-500 mb-2">Will create:</p>
              <ul className="space-y-1">
                {willCreateList.map((name) => (
                  <li key={name} className="text-xs text-stone-600 flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">+</span> {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progress */}
          {running && progress && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <span className="inline-block animate-spin text-emerald-600">⟳</span>
              {progress}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            disabled={running}
            className="flex-1 border border-stone-300 text-stone-700 rounded-lg py-2 text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSetup}
            disabled={running || totalToCreate === 0}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40"
          >
            {running ? "Setting up…" : "Setup Family"}
          </button>
        </div>
      </div>
    </div>
  );
}
