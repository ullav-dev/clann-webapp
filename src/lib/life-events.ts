import type { LifeEvent, EventType } from "@/lib/types";
import { fuzzyDateSortKey } from "@/lib/fuzzy-date";

export interface EventStyle {
  icon: string;
  dotBg: string;
  dotRing: string;
  badge: string;
}

export const DEFAULT_STYLE: EventStyle = {
  icon: "📌",
  dotBg: "bg-stone-100",
  dotRing: "ring-stone-300",
  badge: "bg-stone-100 text-stone-600",
};

export const EVENT_STYLES: Record<string, EventStyle> = {
  Birth:       { icon: "🌱", dotBg: "bg-emerald-100", dotRing: "ring-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
  Death:       { icon: "🕊️", dotBg: "bg-stone-200",   dotRing: "ring-stone-400",   badge: "bg-stone-100 text-stone-600" },
  Marriage:    { icon: "💍", dotBg: "bg-violet-100",  dotRing: "ring-violet-400",  badge: "bg-violet-100 text-violet-700" },
  Divorce:     { icon: "⚖️", dotBg: "bg-amber-100",   dotRing: "ring-amber-400",   badge: "bg-amber-100 text-amber-700" },
  Graduation:  { icon: "🎓", dotBg: "bg-blue-100",    dotRing: "ring-blue-400",    badge: "bg-blue-100 text-blue-700" },
  Military:    { icon: "⚔️", dotBg: "bg-red-100",     dotRing: "ring-red-400",     badge: "bg-red-100 text-red-700" },
  Immigration: { icon: "✈️", dotBg: "bg-sky-100",     dotRing: "ring-sky-400",     badge: "bg-sky-100 text-sky-700" },
  Emigration:  { icon: "✈️", dotBg: "bg-sky-100",     dotRing: "ring-sky-400",     badge: "bg-sky-100 text-sky-700" },
  NameChange:  { icon: "✏️", dotBg: "bg-teal-100",    dotRing: "ring-teal-400",    badge: "bg-teal-100 text-teal-700" },
  Other:       DEFAULT_STYLE,
};

export const EVENT_LABELS: Record<string, string> = {
  NameChange: "Name Change",
};

export const KNOWN_EVENT_TYPES: EventType[] = [
  "Birth", "Death", "Marriage", "Divorce", "Graduation",
  "Immigration", "Emigration", "Military", "NameChange", "Other",
];

export function labelFor(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

export function styleFor(eventType: string): EventStyle {
  return EVENT_STYLES[eventType] ?? DEFAULT_STYLE;
}

/**
 * Chronological sort key for a life-event date. Undated events sort last.
 * Delegates to the shared fuzzy-date parser (handles ISO, slash, month-name,
 * ranges and approximations) rather than a hand-rolled regex.
 */
export function dateSortKey(date: string | null | undefined): number {
  const k = fuzzyDateSortKey(date);
  return k === null ? Infinity : k;
}

export function sortedEvents(events: LifeEvent[]): LifeEvent[] {
  return [...events].sort((a, b) => {
    if (a.event_type === "Birth" && b.event_type !== "Birth") return -1;
    if (b.event_type === "Birth" && a.event_type !== "Birth") return 1;
    const ka = dateSortKey(a.date);
    const kb = dateSortKey(b.date);
    // Both undated (Infinity − Infinity = NaN) → treat as equal.
    if (ka === kb) return 0;
    return ka - kb;
  });
}
