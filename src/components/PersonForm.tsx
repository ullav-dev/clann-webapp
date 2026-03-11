"use client";

import { useState } from "react";
import type { CreatePerson, UpdatePerson, Sex } from "@/lib/types";

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

export default function PersonForm({ initial, onSubmit, submitLabel = "Save" }: Props) {
  const [values, setValues] = useState<FormValues>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function toggle(field: keyof FormValues) {
    setValues((v) => ({ ...v, [field]: !v[field] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.sex) return setError("Sex is required");
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
      setError(err instanceof Error ? err.message : "Unknown error");
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
        <Field label="First Name *" htmlFor="first_name">
          <input
            id="first_name"
            required
            value={values.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            className={input}
          />
        </Field>
        <Field label="Middle Name (optional)" htmlFor="middle_name">
          <input
            id="middle_name"
            value={values.middle_name}
            onChange={(e) => set("middle_name", e.target.value)}
            className={input}
          />
        </Field>
        <Field label="Family Name *" htmlFor="family_name">
          <input
            id="family_name"
            required
            value={values.family_name}
            onChange={(e) => set("family_name", e.target.value)}
            className={input}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Sex *" htmlFor="sex">
          <select
            id="sex"
            required
            value={values.sex}
            onChange={(e) => set("sex", e.target.value)}
            className={input}
          >
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
      </div>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          Birth <span className="font-normal normal-case text-stone-400">(optional)</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date of Birth" htmlFor="date_of_birth">
            <input
              id="date_of_birth"
              type="date"
              value={values.date_of_birth}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => set("date_of_birth", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Place of Birth" htmlFor="place_of_birth">
            <input
              id="place_of_birth"
              value={values.place_of_birth}
              placeholder="e.g. Dublin, Ireland"
              onChange={(e) => set("place_of_birth", e.target.value)}
              className={input}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          Death <span className="font-normal normal-case text-stone-400">(optional)</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date of Death" htmlFor="date_of_death">
            <input
              id="date_of_death"
              type="date"
              value={values.date_of_death}
              min={values.date_of_birth || undefined}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => set("date_of_death", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Place of Death" htmlFor="place_of_death">
            <input
              id="place_of_death"
              value={values.place_of_death}
              placeholder="e.g. Cork, Ireland"
              onChange={(e) => set("place_of_death", e.target.value)}
              className={input}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          Identity <span className="font-normal normal-case text-stone-400">(optional)</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Nickname" htmlFor="nickname">
            <input
              id="nickname"
              value={values.nickname}
              placeholder="e.g. Johnny"
              onChange={(e) => set("nickname", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Username" htmlFor="username">
            <input
              id="username"
              value={values.username}
              placeholder="e.g. jsmith"
              onChange={(e) => set("username", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              value={values.email}
              placeholder="e.g. john@example.com"
              onChange={(e) => set("email", e.target.value)}
              className={input}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <input
            id="verified"
            type="checkbox"
            checked={values.verified}
            onChange={() => toggle("verified")}
            className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-stone-700">Identity verified</span>
        </label>
      </fieldset>

      <fieldset className="border border-stone-200 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">
          Biography <span className="font-normal normal-case text-stone-400">(optional)</span>
        </legend>
        <div className="flex flex-col gap-1">
          <textarea
            id="biography"
            value={values.biography}
            maxLength={1000}
            rows={4}
            placeholder="A short biography…"
            onChange={(e) => set("biography", e.target.value)}
            className={`${input} resize-y`}
          />
          <p className="text-xs text-stone-400 text-right">
            {values.biography.length} / 1000
          </p>
        </div>
      </fieldset>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      {children}
    </div>
  );
}

const input =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
