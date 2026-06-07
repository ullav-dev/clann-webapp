"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Person, LifeEvent } from "@/lib/types";
import { fullName } from "@/components/PersonCard";
import { labelFor, styleFor } from "@/lib/life-events";
import { rawEventId } from "@/lib/api";

interface Props {
  person: Person;
  lifeImageUrl: string | null;
  lifeEvents?: LifeEvent[];
  lifeEventsMode?: "summary" | "full";
  imageBlobUrls?: Record<string, string>;
}

export default function LifeStoryPrintView({ person, lifeImageUrl, lifeEvents, lifeEventsMode = "summary", imageBlobUrls = {} }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasBirthInfo = person.date_of_birth || person.place_of_birth;
  const showEvents = lifeEvents && lifeEvents.length > 0;

  if (!mounted) return null;

  return createPortal(
    <div className="life-story-print">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-stone-300">
        <h1 className="text-3xl font-bold text-stone-900 mb-1">{fullName(person)}</h1>
        {hasBirthInfo && (
          <p className="text-stone-500 text-sm">
            {person.date_of_birth && <>b.&nbsp;{person.date_of_birth}</>}
            {person.date_of_birth && person.place_of_birth && <>&ensp;·&ensp;</>}
            {person.place_of_birth && <>{person.place_of_birth}</>}
          </p>
        )}
      </div>

      {/* Body: image + biography */}
      {lifeImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lifeImageUrl}
          alt={fullName(person)}
          className="float-left mr-6 mb-4 rounded-lg"
          style={{ maxWidth: "260px", maxHeight: "340px", objectFit: "cover" }}
        />
      )}

      {person.biography && (
        <div className="prose prose-stone prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{person.biography}</ReactMarkdown>
        </div>
      )}

      {/* Clear float */}
      <div style={{ clear: "both" }} />

      {/* Life Events section — starts on new page */}
      {showEvents && (
        <div className="life-events-section">
          <div className="mb-4 pb-3 border-b-2 border-stone-300">
            <h2 className="text-2xl font-bold text-stone-900">Life Events</h2>
          </div>

          {lifeEventsMode === "summary" ? (
            <SummaryTable events={lifeEvents} />
          ) : (
            <FullDetail events={lifeEvents} imageBlobUrls={imageBlobUrls} />
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

function SummaryTable({ events }: { events: LifeEvent[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85em" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #d6d3d1" }}>
          <th style={{ textAlign: "left", padding: "6px 8px", color: "#57534e", fontWeight: 600 }}>Date</th>
          <th style={{ textAlign: "left", padding: "6px 8px", color: "#57534e", fontWeight: 600 }}>Event</th>
          <th style={{ textAlign: "left", padding: "6px 8px", color: "#57534e", fontWeight: 600 }}>Type</th>
          <th style={{ textAlign: "left", padding: "6px 8px", color: "#57534e", fontWeight: 600 }}>Description</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event, i) => {
          const style = styleFor(event.event_type);
          return (
            <tr key={event.id} style={{ borderBottom: "1px solid #e7e5e4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
              <td style={{ padding: "6px 8px", color: "#78716c", whiteSpace: "nowrap" }}>{event.date ?? "—"}</td>
              <td style={{ padding: "6px 8px", fontWeight: 500 }}>
                {style.icon}&nbsp;{event.name}
                {event.verified && <span style={{ marginLeft: 4, color: "#059669", fontSize: "0.75em" }}>✓</span>}
              </td>
              <td style={{ padding: "6px 8px", color: "#78716c" }}>{labelFor(event.event_type)}</td>
              <td style={{ padding: "6px 8px", color: "#57534e" }}>{event.description ?? ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function FullDetail({ events, imageBlobUrls }: { events: LifeEvent[]; imageBlobUrls: Record<string, string> }) {
  return (
    <div>
      {events.map((event) => {
        const style = styleFor(event.event_type);
        const blobUrl = imageBlobUrls[rawEventId(event.id)];
        return (
          <div key={event.id} className="life-event-card">
            {/* Event header */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "1.1em" }}>{style.icon}</span>
              <h3 style={{ margin: 0, fontSize: "1.1em", fontWeight: 700, color: "#1c1917" }}>
                {event.name}
              </h3>
              {event.verified && (
                <span style={{ fontSize: "0.7em", color: "#059669", fontWeight: 600, border: "1px solid #059669", borderRadius: 4, padding: "1px 4px" }}>Verified</span>
              )}
            </div>

            {/* Meta row: date + type */}
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.8em", color: "#78716c", marginBottom: "0.5rem" }}>
              {event.date && <span>{event.date}</span>}
              <span>{labelFor(event.event_type)}</span>
            </div>

            {/* Description */}
            {event.description && (
              <p style={{ margin: "0 0 0.5rem", color: "#57534e", fontSize: "0.9em" }}>{event.description}</p>
            )}

            {/* Story */}
            {event.story && (
              <div className="prose prose-stone prose-sm max-w-none" style={{ marginBottom: "0.5rem" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.story}</ReactMarkdown>
              </div>
            )}

            {/* Source image */}
            {blobUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blobUrl}
                alt={`Source: ${event.name}`}
                style={{ maxWidth: "240px", maxHeight: "200px", objectFit: "contain", borderRadius: 6, border: "1px solid #e7e5e4", marginBottom: "0.5rem" }}
              />
            )}

            {/* Source link */}
            {event.source_link && (
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.8em" }}>
                <span style={{ color: "#78716c" }}>Source: </span>
                <a href={event.source_link} style={{ color: "#0369a1" }}>{event.source_link}</a>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
