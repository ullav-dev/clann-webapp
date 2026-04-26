"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export type CardItem = {
  title: string;
  body: string;
  email?: string;
};

export type StepItem = {
  number: number;
  title: string;
  body: string;
};

export type HelpSection = {
  id: string;
  icon: string;
  title: string;
  steps?: StepItem[];
  cards?: CardItem[];
};

interface Props {
  title: string;
  subtitle: string;
  sections: HelpSection[];
  ctaText: string;
  ctaButtonText: string;
  ctaHref: string;
}

export default function HelpPageClient({ title, subtitle, sections, ctaText, ctaButtonText, ctaHref }: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  const normalizedQuery = query.toLowerCase().trim();
  const visibleSections = normalizedQuery
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(normalizedQuery) ||
          s.steps?.some(
            (st) =>
              st.title.toLowerCase().includes(normalizedQuery) ||
              st.body.toLowerCase().includes(normalizedQuery)
          ) ||
          s.cards?.some(
            (c) =>
              c.title.toLowerCase().includes(normalizedQuery) ||
              c.body.toLowerCase().includes(normalizedQuery)
          )
      )
    : sections;

  const visibleIdsKey = visibleSections.map((s) => s.id).join(",");

  useEffect(() => {
    const ids = visibleSections.map((s) => s.id);
    const intersecting = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersecting.add(entry.target.id);
          } else {
            intersecting.delete(entry.target.id);
          }
        });
        const topmost = ids.find((id) => intersecting.has(id));
        if (topmost) setActiveId(topmost);
      },
      { rootMargin: "-80px 0px -50% 0px", threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    setActiveId(ids[0] ?? "");

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIdsKey]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex gap-8">
      {/* Sticky TOC sidebar — desktop only */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24 space-y-1">
          <div className="mb-4">
            <input
              type="search"
              placeholder="Search help…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition bg-white"
            />
          </div>
          {visibleSections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeId === s.id
                  ? "text-emerald-700 bg-emerald-50 font-medium"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <span className="shrink-0">{s.icon}</span>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-10">
        {/* Mobile search */}
        <div className="lg:hidden">
          <input
            type="search"
            placeholder="Search help…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition bg-white"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2">{title}</h1>
          <p className="text-stone-500">{subtitle}</p>
        </div>

        {visibleSections.length === 0 && (
          <div className="text-center py-20 text-stone-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-base font-medium text-stone-500">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm mt-1">Try a feature name, topic, or keyword.</p>
          </div>
        )}

        {visibleSections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{section.icon}</span>
              <h2 className="text-xl font-bold text-stone-800">{section.title}</h2>
            </div>

            {section.steps && section.steps.length > 0 && (
              <div className="space-y-3 mb-4">
                {section.steps.map((step) => (
                  <div key={step.number} className="flex gap-4 bg-white rounded-xl border border-stone-200 p-4">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">
                      {step.number}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-800 text-sm mb-1">{step.title}</p>
                      <p className="text-stone-500 text-sm leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.cards && section.cards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.cards.map((card, i) =>
                  card.email ? (
                    <div key={i} className="bg-white rounded-xl border border-stone-200 p-4">
                      <p className="font-semibold text-stone-800 text-sm mb-1">{card.title}</p>
                      <p className="text-stone-500 text-sm leading-relaxed mb-2">{card.body}</p>
                      <a href={`mailto:${card.email}`} className="text-sm font-medium text-emerald-700 hover:underline">
                        {card.email}
                      </a>
                    </div>
                  ) : (
                    <div key={i} className="bg-white rounded-xl border border-stone-200 p-4">
                      <p className="font-semibold text-stone-800 text-sm mb-1">{card.title}</p>
                      <p className="text-stone-500 text-sm leading-relaxed">{card.body}</p>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        ))}

        {visibleSections.length > 0 && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-5 flex items-center justify-between gap-4">
            <p className="text-emerald-800 text-sm">{ctaText}</p>
            <Link
              href={ctaHref}
              className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {ctaButtonText}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
