"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { DamPicker } from "@ullav/dam-picker";
import type { PickedAsset } from "@ullav/dam-picker";
import * as api from "@/lib/api";
import type { LifeEvent, EventType, CreateLifeEvent, UpdateLifeEvent } from "@/lib/types";

const MarkdownEditor = dynamic(() => import("@/components/MarkdownEditor"), { ssr: false });

// ─── event type styles ────────────────────────────────────────────────────────

interface EventStyle {
  icon: string;
  dotBg: string;
  dotRing: string;
  badge: string;
}

const DEFAULT_STYLE: EventStyle = {
  icon: "📌",
  dotBg: "bg-stone-100",
  dotRing: "ring-stone-300",
  badge: "bg-stone-100 text-stone-600",
};

const EVENT_STYLES: Record<string, EventStyle> = {
  Birth:       { icon: "🌱", dotBg: "bg-emerald-100", dotRing: "ring-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
  Death:       { icon: "🕊️", dotBg: "bg-stone-200",   dotRing: "ring-stone-400",   badge: "bg-stone-100 text-stone-600" },
  Marriage:    { icon: "💍", dotBg: "bg-violet-100",  dotRing: "ring-violet-400",  badge: "bg-violet-100 text-violet-700" },
  Divorce:     { icon: "⚖️", dotBg: "bg-amber-100",   dotRing: "ring-amber-400",   badge: "bg-amber-100 text-amber-700" },
  Graduation:  { icon: "🎓", dotBg: "bg-blue-100",    dotRing: "ring-blue-400",    badge: "bg-blue-100 text-blue-700" },
  Military:    { icon: "⚔️", dotBg: "bg-red-100",     dotRing: "ring-red-400",     badge: "bg-red-100 text-red-700" },
  Immigration: { icon: "✈️", dotBg: "bg-sky-100",     dotRing: "ring-sky-400",     badge: "bg-sky-100 text-sky-700" },
  Emigration:  { icon: "✈️", dotBg: "bg-sky-100",     dotRing: "ring-sky-400",     badge: "bg-sky-100 text-sky-700" },
  Other:       DEFAULT_STYLE,
};

function styleFor(eventType: string): EventStyle {
  return EVENT_STYLES[eventType] ?? DEFAULT_STYLE;
}

// ─── date sorting ─────────────────────────────────────────────────────────────

function dateSortKey(date: string | null | undefined): number {
  if (!date) return Infinity;
  const yearMatch = date.match(/\d{4}/);
  if (!yearMatch) return Infinity;
  const year = parseInt(yearMatch[0]);
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const lower = date.toLowerCase();
  const monthIdx = months.findIndex((m) => lower.includes(m));
  const month = monthIdx >= 0 ? monthIdx + 1 : 0;
  const dayMatch = date.match(/\b([1-9]|[12]\d|3[01])\b/);
  const day = dayMatch ? parseInt(dayMatch[1]) : 0;
  return year * 10000 + month * 100 + day;
}

function sortedEvents(events: LifeEvent[]): LifeEvent[] {
  return [...events].sort((a, b) => dateSortKey(a.date) - dateSortKey(b.date));
}

// ─── known event types ────────────────────────────────────────────────────────

const KNOWN_EVENT_TYPES: EventType[] = [
  "Birth", "Death", "Marriage", "Divorce", "Graduation",
  "Immigration", "Emigration", "Military", "Other",
];

// ─── source indicator icons ───────────────────────────────────────────────────

function SourceIcons({ event }: { event: LifeEvent }) {
  return (
    <span className="flex items-center gap-1 text-xs text-stone-400">
      {event.source_link  && <span title="External source link">🔗</span>}
      {event.source_image && <span title="Source image in media library">🖼️</span>}
      {event.source_doc   && <span title="Source document in media library">📄</span>}
    </span>
  );
}

// ─── view event panel ─────────────────────────────────────────────────────────

function ViewEventPanel({ event }: { event: LifeEvent }) {
  const t = useTranslations("lifeEvents");
  const hasSources = !!(event.source_link || event.source_image || event.source_doc);

  return (
    <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">
      {/* Full story rendered as markdown */}
      {event.story && (
        <div className="prose prose-stone prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.story}</ReactMarkdown>
        </div>
      )}

      {/* Sources */}
      {hasSources && (
        <div className={`space-y-1.5 ${event.story ? "pt-2 border-t border-stone-100" : ""}`}>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">{t("sources")}</p>
          {event.source_link && (
            <a
              href={event.source_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 break-all"
            >
              🔗 <span>{event.source_link}</span>
            </a>
          )}
          {event.source_image && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <span>🖼️ {t("fieldSourceImage")}:</span>
              <a
                href={event.source_image}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 truncate"
              >
                {event.source_image.split("/").pop()}
              </a>
            </div>
          )}
          {event.source_doc && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <span>📄 {t("fieldSourceDoc")}:</span>
              <a
                href={event.source_doc}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 truncate"
              >
                {event.source_doc.split("/").pop()}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── asset picker button + preview ───────────────────────────────────────────

interface AssetPickerFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  token: string;
  username: string;
  filterType: "image" | "document";
}

function AssetPickerField({ label, value, onChange, token, username, filterType }: AssetPickerFieldProps) {
  const t = useTranslations("lifeEvents");
  const [showPicker, setShowPicker] = useState(false);

  function handlePick(asset: PickedAsset) {
    onChange(asset.url);
    setShowPicker(false);
  }

  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">{label}</label>
      <div className="flex items-center gap-2 flex-wrap">
        {value ? (
          <>
            <span className="text-xs text-stone-600 truncate max-w-xs border border-stone-200 bg-stone-50 rounded px-2 py-1">
              {value.split("/").pop()}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              {t("clear")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker((s) => !s)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {showPicker ? t("hidePicker") : (filterType === "image" ? t("browseImageAsset") : t("browseDocAsset"))}
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => setShowPicker((s) => !s)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showPicker ? t("hidePicker") : t("changePicker")}
          </button>
        )}
      </div>
      {showPicker && (
        <div className="mt-2 h-72 border border-stone-200 rounded-lg overflow-hidden">
          <DamPicker
            apiBase="/api/dam"
            token={token}
            username={username}
            onSelect={handlePick}
            filter={(a) =>
              filterType === "image"
                ? a.asset_type.startsWith("image/")
                : !a.asset_type.startsWith("image/")
            }
          />
        </div>
      )}
    </div>
  );
}

// ─── edit event panel ─────────────────────────────────────────────────────────

interface EditEventPanelProps {
  event: LifeEvent;
  token: string;
  username: string;
  onSaved: (updated: LifeEvent) => void;
  onCancel: () => void;
}

function EditEventPanel({ event, token, username, onSaved, onCancel }: EditEventPanelProps) {
  const t = useTranslations("lifeEvents");
  const cursorPosRef = useRef<number | null>(null);
  const [showStoryPicker, setShowStoryPicker] = useState(false);

  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date ?? "");
  const [eventType, setEventType] = useState<EventType>(
    KNOWN_EVENT_TYPES.includes(event.event_type as EventType) ? event.event_type : "_custom"
  );
  const [customType, setCustomType] = useState(
    KNOWN_EVENT_TYPES.includes(event.event_type as EventType) ? "" : event.event_type
  );
  const [description, setDescription] = useState(event.description ?? "");
  const [story, setStory] = useState(event.story ?? "");
  const [sourceLink, setSourceLink] = useState(event.source_link ?? "");
  const [sourceImage, setSourceImage] = useState<string | null>(event.source_image ?? null);
  const [sourceDoc, setSourceDoc] = useState<string | null>(event.source_doc ?? null);
  const [verified, setVerified] = useState(event.verified ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedType = eventType === "_custom" && customType.trim()
    ? customType.trim()
    : eventType === "_custom"
    ? "Other"
    : eventType;

  function insertAssetMarkdown(asset: PickedAsset) {
    const url = asset.url.replace(/\/?$/, "/thumbnail");
    const snippet = `![${asset.name}](${url})`;
    setStory((prev) => {
      const pos = cursorPosRef.current ?? prev.length;
      const before = prev.slice(0, pos);
      const after = prev.slice(pos);
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n\n" : "";
      const suffix = after.length > 0 && !after.startsWith("\n") ? "\n\n" : "";
      return before + prefix + snippet + suffix + after;
    });
    setShowStoryPicker(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateLifeEvent = {
        name: name.trim(),
        event_type: resolvedType,
        date: date.trim() || null,
        description: description.trim() || null,
        story: story.trim() || null,
        source_link: sourceLink.trim() || null,
        source_image: sourceImage,
        source_doc: sourceDoc,
        verified,
      };
      const updated = await api.updateLifeEvent(event.id, payload);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Name + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">{t("fieldName")} *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("fieldNamePlaceholder")}
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">{t("fieldDate")}</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder={t("fieldDatePlaceholder")}
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Event type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">{t("fieldType")}</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {KNOWN_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
            <option value="_custom">{t("customType")}</option>
          </select>
        </div>
        {eventType === "_custom" && (
          <div>
            <label className="block text-xs text-stone-500 mb-1">{t("fieldCustomType")}</label>
            <input
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder={t("fieldCustomTypePlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">{t("fieldDescription")}</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("fieldDescriptionPlaceholder")}
          className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Story */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">{t("fieldStory")}</label>
        <MarkdownEditor
          value={story}
          onChange={setStory}
          height={200}
          placeholder={t("fieldStoryPlaceholder")}
          textareaProps={{
            onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
            onKeyUp:  (e: React.KeyboardEvent<HTMLTextAreaElement>)  => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
            onMouseUp:(e: React.MouseEvent<HTMLTextAreaElement>)      => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; },
          }}
        />
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowStoryPicker((s) => !s)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {showStoryPicker ? t("hidePicker") : t("browseStoryImages")}
          </button>
        </div>
        {showStoryPicker && (
          <div className="mt-2 h-72 border border-stone-200 rounded-lg overflow-hidden">
            <DamPicker
              apiBase="/api/dam"
              token={token}
              username={username}
              onSelect={insertAssetMarkdown}
              filter={(a) => a.asset_type.startsWith("image/")}
            />
          </div>
        )}
      </div>

      {/* Source link */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">{t("fieldSourceLink")}</label>
        <input
          type="url"
          value={sourceLink}
          onChange={(e) => setSourceLink(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Source image + source doc */}
      <div className="grid grid-cols-1 gap-3">
        <AssetPickerField
          label={t("fieldSourceImage")}
          value={sourceImage}
          onChange={setSourceImage}
          token={token}
          username={username}
          filterType="image"
        />
        <AssetPickerField
          label={t("fieldSourceDoc")}
          value={sourceDoc}
          onChange={setSourceDoc}
          token={token}
          username={username}
          filterType="document"
        />
      </div>

      {/* Verified */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
          className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="text-sm text-stone-600">{t("fieldVerified")}</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm px-4 py-1.5 rounded-lg transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </form>
  );
}

// ─── add event form ───────────────────────────────────────────────────────────

interface AddEventFormProps {
  personId: string;
  createdBy: string;
  onSaved: () => void;
  onCancel: () => void;
}

function AddEventForm({ personId, createdBy, onSaved, onCancel }: AddEventFormProps) {
  const t = useTranslations("lifeEvents");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [eventType, setEventType] = useState<EventType>("Other");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedType = eventType === "Other" && customType.trim() ? customType.trim() : eventType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: CreateLifeEvent = {
        name: name.trim(),
        event_type: resolvedType,
        date: date.trim() || null,
        description: description.trim() || null,
        created_by: createdBy,
      };
      await api.createLifeEvent(personId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-stone-700">{t("addEventTitle")}</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">{t("fieldName")} *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("fieldNamePlaceholder")}
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">{t("fieldDate")}</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder={t("fieldDatePlaceholder")}
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">{t("fieldType")}</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {KNOWN_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
            <option value="_custom">{t("customType")}</option>
          </select>
        </div>
        {eventType === "_custom" && (
          <div>
            <label className="block text-xs text-stone-500 mb-1">{t("fieldCustomType")}</label>
            <input
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder={t("fieldCustomTypePlaceholder")}
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-stone-500 mb-1">{t("fieldDescription")}</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("fieldDescriptionPlaceholder")}
          className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm px-4 py-1.5 rounded-lg transition-colors">
          {t("cancel")}
        </button>
        <button type="submit" disabled={saving || !name.trim()} className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
          {saving ? t("saving") : t("addEvent")}
        </button>
      </div>
    </form>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  personId: string;
  personCreatedBy: string | null | undefined;
}

export default function LifeTimeline({ personId, personCreatedBy }: Props) {
  const t = useTranslations("lifeEvents");
  const { user, roles, token } = useAuth();

  const isAdmin = roles.includes("admin");
  const isOwner = !!user && user.username === personCreatedBy;
  const canEdit = isAdmin || isOwner;

  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listLifeEvents(personId);
      setEvents(sortedEvents(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!editingId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setEditingId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editingId]);

  async function handleDelete(eventId: string, eventName: string) {
    if (!confirm(t("deleteConfirm", { name: eventName }))) return;
    setDeleting(eventId);
    try {
      await api.deleteLifeEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(updated: LifeEvent) {
    setEvents((prev) => sortedEvents(prev.map((e) => e.id === updated.id ? updated : e)));
    setEditingId(null);
    setViewingId(null);
  }

  const editingEvent = editingId ? (events.find((e) => e.id === editingId) ?? null) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-pulse">📅</div>
          <p className="text-sm">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 py-8 text-center">{error}</p>;
  }

  return (
    <div className="max-w-2xl">
      {/* Add event button */}
      {canEdit && !showAdd && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + {t("addEvent")}
          </button>
        </div>
      )}

      {/* Add event form */}
      {canEdit && showAdd && (
        <div className="mb-6">
          <AddEventForm
            personId={personId}
            createdBy={user!.username}
            onSaved={() => { setShowAdd(false); load(); }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 && !showAdd && (
        <div className="text-center py-16 text-stone-400">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm">{t("empty")}</p>
          {canEdit && (
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-emerald-700 underline">
              {t("addFirstEvent")}
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-stone-200" aria-hidden />

          <ol className="space-y-1">
            {events.map((event, idx) => {
              const style = styleFor(event.event_type);
              const isLast = idx === events.length - 1;
              const isViewing = viewingId === event.id;
              const hasDetails = !!(event.story || event.source_link || event.source_image || event.source_doc);

              return (
                <li key={event.id} className={`relative flex gap-4 ${isLast ? "pb-2" : "pb-6"}`}>
                  {/* Icon dot */}
                  <div className="relative z-10 flex-shrink-0 mt-0.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ring-2 ${style.dotBg} ${style.dotRing}`}
                      title={event.event_type}
                    >
                      {style.icon}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0 bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Name row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-stone-800 text-sm">{event.name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                            {event.event_type}
                          </span>
                          {event.verified && (
                            <span className="text-xs text-emerald-600 font-medium" title={t("verified")}>✓ {t("verified")}</span>
                          )}
                        </div>

                        {/* Date */}
                        {event.date && (
                          <p className="text-xs text-stone-400 mt-0.5">{event.date}</p>
                        )}

                        {/* Description */}
                        {event.description && (
                          <p className="text-sm text-stone-600 mt-1.5 line-clamp-2">{event.description}</p>
                        )}

                        {/* Story snippet (only when collapsed and no description) */}
                        {event.story && !event.description && !isViewing && (
                          <p className="text-sm text-stone-500 mt-1.5 line-clamp-2 italic">{event.story.replace(/[#*`_[\]]/g, "")}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        {/* Details pill — always visible when there is extra content */}
                        {hasDetails && (
                          <button
                            onClick={() => {
                              if (isViewing) {
                                setViewingId(null);
                              } else {
                                setViewingId(event.id);
                                setEditingId(null);
                              }
                            }}
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors ${
                              isViewing
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                : "border-stone-200 text-stone-500 hover:border-emerald-400 hover:text-emerald-700"
                            }`}
                          >
                            {isViewing ? t("closeDetails") : t("viewDetails")}
                          </button>
                        )}

                        {/* Edit / delete — hover only for owners/admins */}
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingId(event.id); setViewingId(null); }}
                              className="text-xs px-2 py-1 rounded transition-colors text-stone-400 hover:text-emerald-700 hover:bg-emerald-50"
                              title={t("editEvent")}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(event.id, event.name)}
                              disabled={deleting === event.id}
                              className="text-stone-300 hover:text-red-500 disabled:opacity-40 transition-colors text-xl leading-none"
                              title={t("deleteEvent")}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Source indicators (hidden while view panel is open) */}
                    {!isViewing && (event.source_link || event.source_image || event.source_doc) && (
                      <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-2">
                        <span className="text-xs text-stone-400">{t("sources")}:</span>
                        <SourceIcons event={event} />
                      </div>
                    )}

                    {/* View panel */}
                    {isViewing && <ViewEventPanel event={event} />}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Add more button at bottom of timeline */}
          {canEdit && !showAdd && events.length > 0 && (
            <div className="relative flex items-center gap-4 pt-2">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors cursor-pointer"
                onClick={() => setShowAdd(true)}
              >
                +
              </div>
              <button onClick={() => setShowAdd(true)} className="text-sm text-stone-400 hover:text-emerald-700 transition-colors">
                {t("addEvent")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit modal — portalled to document.body to escape any CSS transform on ancestors */}
      {mounted && editingEvent && token && user && createPortal(
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingId(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mb-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800 truncate pr-4">{editingEvent.name}</h2>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="flex-shrink-0 text-stone-400 hover:text-stone-600 text-2xl leading-none transition-colors"
                aria-label={t("cancel")}
              >
                ×
              </button>
            </div>
            <div className="px-5 py-5">
              <EditEventPanel
                key={editingEvent.id}
                event={editingEvent}
                token={token}
                username={user.username}
                onSaved={handleSaved}
                onCancel={() => setEditingId(null)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
