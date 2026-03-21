"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useTree } from "@/contexts/TreeContext";
import * as api from "@/lib/api";
import { parseTreeExport, type ParsedImport } from "@/lib/tree-import";

type Step = "upload" | "name" | "importing" | "done";

interface Progress {
  personsTotal: number;
  personsDone: number;
  relsTotal: number;
  relsDone: number;
}

function slugify(val: string): string {
  return val
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  onClose: () => void;
}

export default function ImportTreeModal({ onClose }: Props) {
  const t = useTranslations("trees");
  const { user } = useAuth();
  const { createTree, setActiveTree } = useTree();
  const router = useRouter();

  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDisplayNameChange(val: string) {
    setDisplayName(val);
    if (!nameManuallyEdited) setName(slugify(val));
  }

  function processFile(file: File) {
    setParseError(null);
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setParseError(t("importInvalidFile"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const result = parseTreeExport(raw);
        setParsed(result);
        const dn = result.suggestedDisplayName || "";
        setDisplayName(dn);
        setName(result.suggestedName || slugify(dn));
        setNameManuallyEdited(!!result.suggestedName);
        setStep("name");
      } catch (err) {
        setParseError(err instanceof Error ? err.message : t("importParseFailed"));
      }
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed || !user) return;
    setImportError(null);
    setStep("importing");

    const prog: Progress = {
      personsTotal: parsed.persons.length,
      personsDone: 0,
      relsTotal: parsed.relationships.length,
      relsDone: 0,
    };
    setProgress(prog);

    try {
      // Step 1: create the tree
      const tree = await api.createTree({ name: name.trim(), display_name: displayName.trim(), owner: user.username });

      // Step 2: create all persons, build old→new ID map
      const idMap = new Map<string, string>();
      for (const person of parsed.persons) {
        const created = await api.createPerson({
          first_name: person.first_name,
          family_name: person.family_name,
          sex: person.sex,
          middle_name: person.middle_name,
          date_of_birth: person.date_of_birth,
          date_of_death: person.date_of_death,
          place_of_birth: person.place_of_birth,
          place_of_death: person.place_of_death,
          nickname: person.nickname,
          username: person.username,
          email: person.email,
          biography: person.biography,
          verified: person.verified,
          created_by: user.username,
          tree: tree.name,
        });
        idMap.set(person.originalId, created.id);
        prog.personsDone += 1;
        setProgress({ ...prog });
      }

      // Step 3: add relationships using mapped IDs
      for (const rel of parsed.relationships) {
        const newPersonId = idMap.get(rel.personId);
        const newRelatedId = idMap.get(rel.relatedId);
        if (!newPersonId || !newRelatedId) {
          prog.relsDone += 1;
          setProgress({ ...prog });
          continue;
        }

        await api.addRelationship(newPersonId, {
          type: rel.type,
          related_id: newRelatedId,
          sibling_type: rel.sibling_type ?? null,
        }, user.username);

        prog.relsDone += 1;
        setProgress({ ...prog });
      }

      // Select the new tree and navigate
      setActiveTree(tree);
      setStep("done");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("importFailed"));
      setStep("name");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">{t("importTitle")}</h2>
          {step !== "importing" && (
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Step: upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-stone-500">{t("importInstructions")}</p>
              {parseError && <p className="text-sm text-red-600">{parseError}</p>}
              <div
                ref={dropRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${dragOver ? "border-emerald-400 bg-emerald-50" : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"}`}
              >
                <svg className="w-10 h-10 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm text-stone-500">{t("importDropZone")}</p>
                <span className="text-xs text-stone-400">.json</span>
              </div>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* Step: name */}
          {step === "name" && parsed && (
            <form onSubmit={handleImport} className="space-y-4">
              <p className="text-sm text-stone-500">
                {t("importPreview", { persons: parsed.persons.length, relationships: parsed.relationships.length })}
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t("importWarning")}
              </p>
              {importError && <p className="text-sm text-red-600">{importError}</p>}
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t("importDisplayName")}</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700">{t("importUniqueName")}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameManuallyEdited(true); }}
                  pattern="[a-z0-9][a-z0-9-]*"
                  title={t("nameHint")}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <p className="text-xs text-stone-400">{t("nameHint")}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep("upload"); setParsed(null); setImportError(null); }}
                  className="flex-1 border border-stone-300 text-stone-600 text-sm py-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  {t("importBack")}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {t("importStart")}
                </button>
              </div>
            </form>
          )}

          {/* Step: importing */}
          {step === "importing" && progress && (
            <div className="space-y-5">
              <ProgressRow
                label={t("importingPersons")}
                done={progress.personsDone}
                total={progress.personsTotal}
              />
              <ProgressRow
                label={t("importingRelationships")}
                done={progress.relsDone}
                total={progress.relsTotal}
                disabled={progress.personsDone < progress.personsTotal}
              />
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <p className="text-stone-700 font-medium">{t("importDone")}</p>
              <p className="text-sm text-stone-500">{t("importDoneDescription")}</p>
              <button
                onClick={() => { onClose(); router.push("/family"); }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {t("importGoToFamily")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, done, total, disabled = false }: { label: string; done: number; total: number; disabled?: boolean }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-stone-600">{label}</span>
        <span className="text-stone-400 tabular-nums">{done} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
