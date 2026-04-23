"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import type { CreatePerson, UpdatePerson, Sex } from "@/lib/types";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useAuth } from "@/contexts/AuthContext";
import { DamPicker } from "@ullav/dam-picker";
import type { PickedAsset } from "@ullav/dam-picker";

type FormValues = {
  first_name: string;
  middle_name: string;
  family_name: string;
  sex: Sex | "";
  date_of_birth: string;
  date_of_death: string;
  place_of_birth: string;
  place_of_death: string;
  nickname: string;
  username: string;
  email: string;
  verified: boolean;
  biography: string;
};

interface Props {
  initial?: Partial<FormValues>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: any) => Promise<void>;
  submitLabel?: string;
  onCancel?: () => void;
}

const empty: FormValues = {
  first_name: "",
  middle_name: "",
  family_name: "",
  sex: "",
  date_of_birth: "",
  date_of_death: "",
  place_of_birth: "",
  place_of_death: "",
  nickname: "",
  username: "",
  email: "",
  verified: false,
  biography: "",
};

export default function PersonForm({ initial, onSubmit, submitLabel, onCancel }: Props) {
  const t = useTranslations("personForm");
  const { token, user } = useAuth();
  const [values, setValues] = useState<FormValues>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [dropZoneSuccess, setDropZoneSuccess] = useState(false);
  const cursorPosRef = useRef<number | null>(null);

  function insertAssetMarkdown(asset: PickedAsset) {
    const url = asset.url.replace(/\/?$/, "/thumbnail");
    const snippet = `![${asset.name}](${url})`;
    setValues((v) => {
      const bio = v.biography;
      const pos = cursorPosRef.current ?? bio.length;
      const before = bio.slice(0, pos);
      const after = bio.slice(pos);
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n\n" : "";
      const suffix = after.length > 0 && !after.startsWith("\n") ? "\n\n" : "";
      return { ...v, biography: before + prefix + snippet + suffix + after };
    });
    setDropZoneSuccess(true);
    setTimeout(() => setDropZoneSuccess(false), 2000);
  }

  function handleBioDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/json")) {
      e.preventDefault();
      setDropZoneActive(true);
    }
  }

  function handleBioDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropZoneActive(false);
    }
  }

  function handleBioDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropZoneActive(false);
    const json = e.dataTransfer.getData("application/json");
    if (!json) return;
    try {
      const asset = JSON.parse(json) as PickedAsset;
      if (asset.id && asset.url) insertAssetMarkdown(asset);
    } catch {
      // not a PickedAsset — ignore
    }
  }

  function set(field: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function toggle(field: keyof FormValues) {
    setValues((v) => ({ ...v, [field]: !v[field] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.sex) return setError(t("sexRequired"));
    setError(null);
    setLoading(true);
    try {
      const optional = (v: string) => v || undefined;
      await onSubmit({
        first_name: values.first_name,
        family_name: values.family_name,
        sex: values.sex as Sex,
        middle_name: optional(values.middle_name),
        date_of_birth: optional(values.date_of_birth),
        date_of_death: optional(values.date_of_death),
        place_of_birth: optional(values.place_of_birth),
        place_of_death: optional(values.place_of_death),
        nickname: optional(values.nickname),
        username: optional(values.username),
        email: optional(values.email),
        verified: values.verified,
        biography: optional(values.biography),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label={t("firstNameLabel")} htmlFor="first_name">
          <input id="first_name" required value={values.first_name} onChange={(e) => set("first_name", e.target.value)} className={input} />
        </Field>
        <Field label={t("middleNameLabel")} htmlFor="middle_name">
          <input id="middle_name" value={values.middle_name} onChange={(e) => set("middle_name", e.target.value)} className={input} />
        </Field>
        <Field label={t("familyNameLabel")} htmlFor="family_name">
          <input id="family_name" required value={values.family_name} onChange={(e) => set("family_name", e.target.value)} className={input} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("sexLabel")} htmlFor="sex">
          <select id="sex" required value={values.sex} onChange={(e) => set("sex", e.target.value)} className={input}>
            <option value="">{t("sexPlaceholder")}</option>
            <option value="Male">{t("sexMale")}</option>
            <option value="Female">{t("sexFemale")}</option>
          </select>
        </Field>
      </div>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          {t("birthSection")} <span className="font-normal normal-case text-stone-400">{t("optional")}</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("dateOfBirthLabel")} htmlFor="date_of_birth">
            <input id="date_of_birth" type="text" value={values.date_of_birth} placeholder={t("datePlaceholder")} onChange={(e) => set("date_of_birth", e.target.value)} className={input} />
          </Field>
          <Field label={t("placeOfBirthLabel")} htmlFor="place_of_birth">
            <input id="place_of_birth" value={values.place_of_birth} placeholder={t("placeOfBirthPlaceholder")} onChange={(e) => set("place_of_birth", e.target.value)} className={input} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          {t("deathSection")} <span className="font-normal normal-case text-stone-400">{t("optional")}</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("dateOfDeathLabel")} htmlFor="date_of_death">
            <input id="date_of_death" type="text" value={values.date_of_death} placeholder={t("datePlaceholder")} onChange={(e) => set("date_of_death", e.target.value)} className={input} />
          </Field>
          <Field label={t("placeOfDeathLabel")} htmlFor="place_of_death">
            <input id="place_of_death" value={values.place_of_death} placeholder={t("placeOfDeathPlaceholder")} onChange={(e) => set("place_of_death", e.target.value)} className={input} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          {t("identitySection")} <span className="font-normal normal-case text-stone-400">{t("optional")}</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t("nicknameLabel")} htmlFor="nickname">
            <input id="nickname" value={values.nickname} placeholder={t("nicknamePlaceholder")} onChange={(e) => set("nickname", e.target.value)} className={input} />
          </Field>
          <Field label={t("usernameLabel")} htmlFor="username">
            <input id="username" value={values.username} placeholder={t("usernamePlaceholder")} onChange={(e) => set("username", e.target.value)} className={input} />
          </Field>
          <Field label={t("emailLabel")} htmlFor="email">
            <input id="email" type="email" value={values.email} placeholder={t("emailPlaceholder")} onChange={(e) => set("email", e.target.value)} className={input} />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <input id="verified" type="checkbox" checked={values.verified} onChange={() => toggle("verified")} className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-sm text-stone-700">{t("identityVerified")}</span>
        </label>
      </fieldset>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          {t("biographySection")} <span className="font-normal normal-case text-stone-400">{t("optional")}</span>
        </legend>

        <MarkdownEditor
          value={values.biography}
          onChange={(v) => set("biography", v)}
          placeholder={t("biographyPlaceholder")}
          height={280}
          textareaProps={{
            onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
            onKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
            onMouseUp: (e: React.MouseEvent<HTMLTextAreaElement>) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
          }}
        />

        {/* Drop zone — separate from the textarea to avoid native text-drop conflicts */}
        <div
          onDragOver={handleBioDragOver}
          onDragLeave={handleBioDragLeave}
          onDrop={handleBioDrop}
          className={`py-2 px-3 rounded-lg border-2 border-dashed text-center text-xs font-medium transition-colors ${
            dropZoneActive
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : dropZoneSuccess
              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
              : "border-stone-200 text-stone-400"
          }`}
        >
          {dropZoneActive
            ? "Release to insert image"
            : dropZoneSuccess
            ? "✓ Image inserted into biography"
            : "Drop an image from the media library here"}
        </div>

        {/* Media library toggle */}
        <button
          type="button"
          onClick={() => setShowPicker((s) => !s)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {showPicker ? "Hide media library" : "Browse media library…"}
        </button>

        {/* Inline DamPicker — click an asset to insert, or drag onto the drop zone above */}
        {showPicker && token && (
          <div className="h-80 border border-stone-200 rounded-lg overflow-hidden">
            <DamPicker
              apiBase="/api/dam"
              token={token}
              username={user?.username}
              onSelect={insertAssetMarkdown}
              filter={(a) => a.asset_type.startsWith("image/") && a.creator === (user?.username ?? "")}
            />
          </div>
        )}
      </fieldset>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            disabled={loading}
            onClick={() => { setValues({ ...empty, ...initial }); onCancel(); }}
            className="border border-stone-300 hover:border-stone-400 disabled:opacity-60 text-stone-600 font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {t("forgetChanges")}
          </button>
        )}
        <button type="submit" disabled={loading} className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
          {loading ? t("saving") : (submitLabel ?? t("saving"))}
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-stone-700">{label}</label>
      {children}
    </div>
  );
}

const input =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
