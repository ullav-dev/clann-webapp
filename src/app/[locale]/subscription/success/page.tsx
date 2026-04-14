"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";

// Stripe appends ?session_id=... to the success URL. PayPal redirects here
// after the user approves the subscription. In both cases we show a
// confirmation message and direct the user to their account page.
//
// Note: the subscription may not be active immediately — PayPal activates
// the subscription via a webhook (BILLING.SUBSCRIPTION.ACTIVATED) which
// may arrive seconds after the redirect. The account page will show the
// correct status once the webhook is processed.

export default function SubscriptionSuccessPage() {
  const t = useTranslations("subscriptionSuccess");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-stone-900 mb-2">{t("heading")}</h1>
        <p className="text-sm text-stone-500 mb-8">{t("message")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/account/subscription"
            className="inline-flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {t("viewSubscription")}
          </Link>
          <Link
            href="/family"
            className="inline-flex items-center justify-center border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {t("goToFamily")}
          </Link>
        </div>
      </div>
    </div>
  );
}
