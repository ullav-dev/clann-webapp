"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import type { LifeEvent, EventType, CreateLifeEvent } from "@/lib/types";

// ─── event type styles ────────────────────────────────────────────────────────

interface EventStyle {
  icon: string;
  dotBg: string;   // Tailwind bg class for the icon circle
  dotRing: string; // Tailwind ring/border class
  badge: string;   // Tailwind classes for the type badge pill
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

/** Extract a numeric sort key from a fuzzy date string. Undated events sort last. */
function dateSortKey(date: string | null | undefined): number {
  if (!date) return Infinity;
  const yearMatch = date.match(/\d{4}/);
  if (!yearMatch) return Infinity;
  const year = parseInt(yearMatch[0]);
  // Try to resolve month for secondary sort
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const lower = date.toLowerCase();
  const monthIdx = months.findIndex((m) => lower.includes(m));
  const month = monthIdx >= 0 ? monthIdx + 1 : 0;
  // Try to resolve day
  const dayMatch = date.match(/\b([1-9]|[12]\d|3[01])\b/);
  const day = dayMatch ? parseInt(dayMatch[1]) : 0;
  return year * 10000 + month * 100 + day;
}

function sortedEvents(events: LifeEvent[]): LifeEvent[] {
  return [...events].sort((a, b) => dateSortKey(a.date) - dateSortKey(b.date));
}

// ─── known event types for the create form ───────────────────────────────────

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
  const { user, roles } = useAuth();

  const isAdmin = roles.includes("admin");
  const isOwner = !!user && user.username === personCreatedBy;
  const canEdit = isAdmin || isOwner;

  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null); // event id being deleted

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

  useEffect(() => { load(); }, [load]);

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

                        {/* Story snippet */}
                        {event.story && !event.description && (
                          <p className="text-sm text-stone-500 mt-1.5 line-clamp-2 italic">{event.story.replace(/[#*`_[\]]/g, "")}</p>
                        )}
                      </div>

                      {/* Actions */}
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(event.id, event.name)}
                          disabled={deleting === event.id}
                          className="flex-shrink-0 text-stone-300 hover:text-red-500 disabled:opacity-40 transition-colors text-xl leading-none opacity-0 group-hover:opacity-100"
                          title={t("deleteEvent")}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Source indicators */}
                    {(event.source_link || event.source_image || event.source_doc) && (
                      <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-2">
                        <span className="text-xs text-stone-400">{t("sources")}:</span>
                        <SourceIcons event={event} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Add more button at bottom of timeline */}
          {canEdit && !showAdd && events.length > 0 && (
            <div className="relative flex items-center gap-4 pt-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors cursor-pointer" onClick={() => setShowAdd(true)}>
                +
              </div>
              <button onClick={() => setShowAdd(true)} className="text-sm text-stone-400 hover:text-emerald-700 transition-colors">
                {t("addEvent")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
