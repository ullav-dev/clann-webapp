"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSubscription,
  createPortalSession,
  type SubscriptionInfo,
} from "@/lib/auth-api";
import ClannUsageWidget from "@/components/ClannUsageWidget";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    trialing: "bg-sky-100 text-sky-700",
    past_due: "bg-amber-100 text-amber-700",
    cancelled: "bg-stone-100 text-stone-500",
    pending: "bg-stone-100 text-stone-500",
  };
  const cls = colours[status] ?? "bg-stone-100 text-stone-500";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Redirect to login if not authenticated.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // Fetch current subscription once the token is available.
  useEffect(() => {
    if (!token) return;
    getSubscription("clann", token)
      .then(setSub)
      .catch((err) => setFetchError(err instanceof Error ? err.message : t("loadError")));
  }, [token, t]);

  async function handlePortal() {
    if (!token) return;
    setPortalError(null);
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession(token);
      window.location.href = url;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : t("portalError"));
      setPortalLoading(false);
    }
  }

  if (isLoading || !user) return null;

  const isPaid = sub && sub.plan !== "individual";
  const isTrialing = sub?.status === "trialing";

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/family" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          ← {t("backToFamily")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">{t("heading")}</h1>
      <p className="text-sm text-stone-500 mb-8">{t("subheading")}</p>

      <div className="mb-6">
        <ClannUsageWidget />
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm mt-6 mb-0">
          {fetchError}
        </div>
      )}

      {sub && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
          {/* Plan header */}
          <div className="px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-1">
                {t("currentPlan")}
              </p>
              <p className="text-xl font-bold text-stone-900 capitalize">{sub.plan}</p>
              {isTrialing && sub.trial_end && (
                <p className="text-xs text-sky-600 mt-1">
                  {t("trialEnds", { date: formatDate(sub.trial_end) })}
                </p>
              )}
            </div>
            <StatusBadge status={sub.status} />
          </div>

          {/* Details grid */}
          <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4">
            <Detail label={t("product")} value="Clann" />
            <Detail label={t("seats")} value={String(sub.seat_count)} />
            {sub.current_period_start && (
              <Detail label={t("periodStart")} value={formatDate(sub.current_period_start)} />
            )}
            {sub.current_period_end && (
              <Detail label={t("periodEnd")} value={formatDate(sub.current_period_end)} />
            )}
            <Detail label={t("memberSince")} value={formatDate(sub.created_at)} />
          </div>

          {/* Actions */}
          <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
            {!isPaid && (
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {t("upgradePlan")}
              </Link>
            )}
            {isPaid && (
              <>
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="inline-flex items-center justify-center bg-stone-800 hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {portalLoading ? t("redirecting") : t("manageBilling")}
                </button>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {t("changePlan")}
                </Link>
              </>
            )}
          </div>

          {portalError && (
            <div className="px-6 pb-5">
              <p className="text-sm text-red-600">{portalError}</p>
            </div>
          )}
        </div>
      )}

      <p className="mt-8 text-xs text-stone-400 text-center">
        {t("helpText")}{" "}
        <Link href="/help" className="underline hover:text-stone-600 transition-colors">
          {t("helpLink")}
        </Link>
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stone-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-stone-800 font-medium">{value}</p>
    </div>
  );
}
