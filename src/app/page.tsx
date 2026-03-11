import Link from "next/link";

function TreeIllustration() {
  return (
    <svg viewBox="0 0 320 260" className="w-full max-w-sm mx-auto" aria-hidden="true">
      {/* Connecting lines */}
      {/* Root → Father */}
      <line x1="160" y1="130" x2="88" y2="72" stroke="#d1fae5" strokeWidth="2" />
      {/* Root → Mother */}
      <line x1="160" y1="130" x2="232" y2="72" stroke="#d1fae5" strokeWidth="2" />
      {/* Father → Paternal grandfather */}
      <line x1="88" y1="62" x2="44" y2="22" stroke="#bfdbfe" strokeWidth="2" />
      {/* Father → Paternal grandmother */}
      <line x1="88" y1="62" x2="132" y2="22" stroke="#bfdbfe" strokeWidth="2" />
      {/* Mother → Maternal grandfather */}
      <line x1="232" y1="62" x2="188" y2="22" stroke="#fecdd3" strokeWidth="2" />
      {/* Mother → Maternal grandmother */}
      <line x1="232" y1="62" x2="276" y2="22" stroke="#fecdd3" strokeWidth="2" />
      {/* Root → Child 1 */}
      <line x1="160" y1="150" x2="112" y2="210" stroke="#fde68a" strokeWidth="2" />
      {/* Root → Child 2 */}
      <line x1="160" y1="150" x2="208" y2="210" stroke="#fde68a" strokeWidth="2" />
      {/* Root → Spouse */}
      <line x1="180" y1="140" x2="248" y2="140" stroke="#ddd6fe" strokeWidth="2" />

      {/* Grandfather (paternal) */}
      <circle cx="44" cy="16" r="14" fill="#1e40af" opacity="0.85" />
      <text x="44" y="20" textAnchor="middle" fontSize="13" fill="white">👴</text>
      {/* Grandmother (paternal) */}
      <circle cx="132" cy="16" r="14" fill="#1d4ed8" opacity="0.85" />
      <text x="132" y="20" textAnchor="middle" fontSize="13" fill="white">👵</text>

      {/* Grandfather (maternal) */}
      <circle cx="188" cy="16" r="14" fill="#9f1239" opacity="0.85" />
      <text x="188" y="20" textAnchor="middle" fontSize="13" fill="white">👴</text>
      {/* Grandmother (maternal) */}
      <circle cx="276" cy="16" r="14" fill="#be185d" opacity="0.85" />
      <text x="276" y="20" textAnchor="middle" fontSize="13" fill="white">👵</text>

      {/* Father */}
      <circle cx="88" cy="62" r="18" fill="#1d4ed8" opacity="0.9" />
      <text x="88" y="67" textAnchor="middle" fontSize="16" fill="white">👨</text>
      {/* Mother */}
      <circle cx="232" cy="62" r="18" fill="#be185d" opacity="0.9" />
      <text x="232" y="67" textAnchor="middle" fontSize="16" fill="white">👩</text>

      {/* Root person */}
      <circle cx="160" cy="140" r="24" fill="#065f46" />
      <circle cx="160" cy="140" r="22" fill="#059669" />
      <text x="160" y="146" textAnchor="middle" fontSize="20" fill="white">🧑</text>

      {/* Spouse */}
      <circle cx="258" cy="140" r="18" fill="#6d28d9" opacity="0.9" />
      <text x="258" y="145" textAnchor="middle" fontSize="16" fill="white">💑</text>

      {/* Children */}
      <circle cx="112" cy="216" r="16" fill="#b45309" opacity="0.9" />
      <text x="112" y="221" textAnchor="middle" fontSize="14" fill="white">👦</text>
      <circle cx="208" cy="216" r="16" fill="#b45309" opacity="0.9" />
      <text x="208" y="221" textAnchor="middle" fontSize="14" fill="white">👧</text>
    </svg>
  );
}

const features = [
  {
    icon: "🌳",
    title: "Interactive Family Tree",
    description:
      "Visualise up to two generations of ancestors, plus children and spouses, in a colour-coded graph. Toggle between vertical and horizontal layouts, pan, zoom, and click any node to navigate.",
  },
  {
    icon: "👥",
    title: "Relationships",
    description:
      "Link people as Father, Mother, Sibling, or Spouse. Adding a sibling automatically inherits the parent's parents. Spouse relationships carry optional from/to dates.",
  },
  {
    icon: "📸",
    title: "Photos",
    description:
      "Upload a JPEG or PNG photo (up to 3 MB) for each person. Photos appear on profile cards, detail pages, and directly in the family tree graph.",
  },
  {
    icon: "📤",
    title: "Export",
    description:
      "Download the family tree as a JPEG image to share with family, or as a structured JSON file for archiving or importing into other tools.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-600 px-8 py-12 sm:px-16 overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">🌳</span>
              <span className="text-4xl font-bold tracking-tight">Clann</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Your family history,<br />beautifully connected.
            </h1>
            <p className="text-emerald-100 text-lg mb-8 max-w-md">
              Clann is a private family tree app. Record people, build
              relationships, and explore your ancestry through an interactive
              visual graph — all stored on your own server.
            </p>
            <Link
              href="/family"
              className="inline-flex items-center gap-2 bg-white text-emerald-800 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-xl transition-colors shadow-md"
            >
              Open My Family →
            </Link>
          </div>
          <div className="flex-1 w-full lg:max-w-sm opacity-90">
            <TreeIllustration />
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-stone-800 mb-8 text-center">Everything you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-stone-800 mb-2">{f.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="text-center py-8">
        <p className="text-stone-500 mb-4">Ready to start mapping your family?</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/family"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            My Family
          </Link>
          <Link
            href="/persons/new"
            className="border border-stone-300 hover:bg-stone-100 text-stone-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Add First Person
          </Link>
        </div>
      </section>
    </div>
  );
}
