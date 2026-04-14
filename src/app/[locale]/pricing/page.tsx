"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { createCheckoutSession } from "@/lib/auth-api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = "individual" | "family" | "professional" | "enterprise";

interface PlanDef {
  key: Plan;
  comingSoon?: boolean;
}

const PLANS: PlanDef[] = [
  { key: "individual" },
  { key: "family" },
  { key: "professional", comingSoon: true },
  { key: "enterprise", comingSoon: true },
];

// ── Checkout modal ────────────────────────────────────────────────────────────

function CheckoutModal({
  plan,
  onClose,
  token,
}: {
  plan: Plan;
  onClose: () => void;
  token: string;
}) {
  const t = useTranslations("pricing");
  const [provider, setProvider] = useState<"stripe" | "paypal">("stripe");
  const [seatCount, setSeatCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const seats = plan === "family" ? seatCount : 1;
      const { url } = await createCheckoutSession(provider, "clann", plan, seats, token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-stone-800 mb-1">
          {t("checkoutTitle")}
        </h2>
        <p className="text-sm text-stone-500 mb-5">
          {t(`plans.${plan}.name`)}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {plan === "family" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-stone-700">
                {t("seatCount")}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSeatCount((n) => Math.max(2, n - 1))}
                  className="w-8 h-8 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors font-medium"
                >
                  −
                </button>
                <span className="text-sm font-semibold text-stone-800 w-6 text-center">
                  {seatCount}
                </span>
                <button
                  type="button"
                  onClick={() => setSeatCount((n) => Math.min(10, n + 1))}
                  className="w-8 h-8 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors font-medium"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">{t("seatHint")}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">
              {t("paymentProvider")}
            </label>
            <div className="flex gap-2">
              {(["stripe", "paypal"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    provider === p
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-stone-300 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {p === "stripe" ? "💳 Stripe" : "🅿 PayPal"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? t("redirecting") : t("proceedToPayment")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {t("cancel")}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  planDef,
  onSubscribe,
  isLoggedIn,
}: {
  planDef: PlanDef;
  onSubscribe: (plan: Plan) => void;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("pricing");
  const router = useRouter();
  const { key: plan, comingSoon } = planDef;

  const isEnterprise = plan === "enterprise";
  const isFree = plan === "individual";

  function handleCta() {
    if (comingSoon) return;
    if (isEnterprise) {
      router.push("/help");
      return;
    }
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (isFree) {
      router.push("/family");
      return;
    }
    onSubscribe(plan);
  }

  const features = (t.raw(`plans.${plan}.features`) as string[]) ?? [];

  return (
    <div
      className={`relative flex flex-col bg-white rounded-2xl border shadow-sm p-6 ${
        plan === "family"
          ? "border-emerald-400 ring-2 ring-emerald-400/30"
          : "border-stone-200"
      }`}
    >
      {comingSoon && (
        <div className="absolute top-4 right-4 text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
          {t("comingSoon")}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-base font-semibold text-stone-800">
          {t(`plans.${plan}.name`)}
        </h3>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-3xl font-bold text-stone-900">
            {t(`plans.${plan}.price`)}
          </span>
          {!isFree && !isEnterprise && (
            <span className="text-sm text-stone-400 mb-1">{t("perMonth")}</span>
          )}
        </div>
        {plan === "family" && (
          <p className="text-xs text-stone-400 mt-1">{t("familyPriceNote")}</p>
        )}
        <p className="text-sm text-stone-500 mt-2">
          {t(`plans.${plan}.description`)}
        </p>
      </div>

      <ul className="flex-1 space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
            <span className="mt-0.5 text-emerald-600 shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={handleCta}
        disabled={comingSoon}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          comingSoon
            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
            : plan === "family"
            ? "bg-emerald-700 hover:bg-emerald-800 text-white"
            : isEnterprise
            ? "border border-stone-300 text-stone-700 hover:bg-stone-50"
            : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {t(`plans.${plan}.cta`)}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const t = useTranslations("pricing");
  const { user, token } = useAuth();
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  return (
    <div className="py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-3">{t("heading")}</h1>
        <p className="text-stone-500 max-w-xl mx-auto">{t("subheading")}</p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 max-w-6xl mx-auto">
        {PLANS.map((planDef) => (
          <PlanCard
            key={planDef.key}
            planDef={planDef}
            isLoggedIn={!!user}
            onSubscribe={(plan) => setCheckoutPlan(plan)}
          />
        ))}
      </div>

      <p className="text-center text-xs text-stone-400 mt-10">
        {t("trialNote")}{" "}
        <Link href="/help" className="underline hover:text-stone-600 transition-colors">
          {t("learnMore")}
        </Link>
      </p>

      {checkoutPlan && token && (
        <CheckoutModal
          plan={checkoutPlan}
          token={token}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </div>
  );
}
