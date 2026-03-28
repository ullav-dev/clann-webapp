import { getTranslations } from "next-intl/server";
import Link from "next/link";

function TreeIllustration() {
  return (
    <svg viewBox="0 0 320 260" className="w-full max-w-sm mx-auto" aria-hidden="true">
      <line x1="160" y1="130" x2="88" y2="72" stroke="#d1fae5" strokeWidth="2" />
      <line x1="160" y1="130" x2="232" y2="72" stroke="#d1fae5" strokeWidth="2" />
      <line x1="88" y1="62" x2="44" y2="22" stroke="#bfdbfe" strokeWidth="2" />
      <line x1="88" y1="62" x2="132" y2="22" stroke="#bfdbfe" strokeWidth="2" />
      <line x1="232" y1="62" x2="188" y2="22" stroke="#fecdd3" strokeWidth="2" />
      <line x1="232" y1="62" x2="276" y2="22" stroke="#fecdd3" strokeWidth="2" />
      <line x1="160" y1="150" x2="112" y2="210" stroke="#fde68a" strokeWidth="2" />
      <line x1="160" y1="150" x2="208" y2="210" stroke="#fde68a" strokeWidth="2" />
      <line x1="180" y1="140" x2="248" y2="140" stroke="#ddd6fe" strokeWidth="2" />
      <circle cx="44" cy="16" r="14" fill="#1e40af" opacity="0.85" />
      <text x="44" y="20" textAnchor="middle" fontSize="13" fill="white">👴</text>
      <circle cx="132" cy="16" r="14" fill="#1d4ed8" opacity="0.85" />
      <text x="132" y="20" textAnchor="middle" fontSize="13" fill="white">👵</text>
      <circle cx="188" cy="16" r="14" fill="#9f1239" opacity="0.85" />
      <text x="188" y="20" textAnchor="middle" fontSize="13" fill="white">👴</text>
      <circle cx="276" cy="16" r="14" fill="#be185d" opacity="0.85" />
      <text x="276" y="20" textAnchor="middle" fontSize="13" fill="white">👵</text>
      <circle cx="88" cy="62" r="18" fill="#1d4ed8" opacity="0.9" />
      <text x="88" y="67" textAnchor="middle" fontSize="16" fill="white">👨</text>
      <circle cx="232" cy="62" r="18" fill="#be185d" opacity="0.9" />
      <text x="232" y="67" textAnchor="middle" fontSize="16" fill="white">👩</text>
      <circle cx="160" cy="140" r="24" fill="#065f46" />
      <circle cx="160" cy="140" r="22" fill="#059669" />
      <text x="160" y="146" textAnchor="middle" fontSize="20" fill="white">🧑</text>
      <circle cx="258" cy="140" r="18" fill="#6d28d9" opacity="0.9" />
      <text x="258" y="145" textAnchor="middle" fontSize="16" fill="white">💑</text>
      <circle cx="112" cy="216" r="16" fill="#b45309" opacity="0.9" />
      <text x="112" y="221" textAnchor="middle" fontSize="14" fill="white">👦</text>
      <circle cx="208" cy="216" r="16" fill="#b45309" opacity="0.9" />
      <text x="208" y="221" textAnchor="middle" fontSize="14" fill="white">👧</text>
    </svg>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const features = [
    { icon: "🌳", title: t("features.tree.title"), description: t("features.tree.description") },
    { icon: "👥", title: t("features.relationships.title"), description: t("features.relationships.description") },
    { icon: "📸", title: t("features.photos.title"), description: t("features.photos.description") },
    { icon: "📤", title: t("features.export.title"), description: t("features.export.description") },
  ];

  return (
    <div className="space-y-16">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-600 px-8 py-12 sm:px-16 overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">🌳</span>
              <span className="text-4xl font-bold tracking-tight">Clann</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              {t("heroHeading1")}<br />{t("heroHeading2")}
            </h1>
            <p className="text-emerald-100 text-lg mb-8 max-w-md">{t("heroDescription")}</p>
            <Link
              href="/family"
              className="inline-flex items-center gap-2 bg-white text-emerald-800 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-xl transition-colors shadow-md"
            >
              {t("openFamily")}
            </Link>
          </div>
          <div className="flex-1 w-full lg:max-w-sm opacity-90">
            <TreeIllustration />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-stone-800 mb-8 text-center">{t("featuresHeading")}</h2>
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

      <section className="text-center py-8">
        <p className="text-stone-500 mb-4">{t("ctaText")}</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/family"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {t("myFamily")}
          </Link>
        </div>
      </section>
    </div>
  );
}
