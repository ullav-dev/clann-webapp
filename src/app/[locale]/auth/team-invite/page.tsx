"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam } from "@/contexts/TeamContext";
import { acceptInvitation, declineInvitation } from "@/lib/teams-api";
import { useTranslations } from "next-intl";
import Link from "next/link";

function TeamInviteInner() {
  const { token, user, isLoading: authLoading } = useAuth();
  const { reload } = useTeam();
  const t = useTranslations("team");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] ?? "en";

  const inviteToken = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "accepting" | "accepted" | "declined" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated, preserving the invite URL
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = encodeURIComponent(`/${locale}/auth/team-invite${window.location.search}`);
      router.push(`/${locale}/login?tab=login&returnUrl=${returnUrl}`);
    }
  }, [authLoading, user, locale, router]);

  if (!inviteToken) {
    return (
      <div className="max-w-sm mx-auto py-20 text-center space-y-4">
        <p className="text-stone-500 text-sm">{t("inviteInvalid")}</p>
        <Link href={`/${locale}/family`} className="text-sm text-violet-700 hover:underline">
          {t("goHome")}
        </Link>
      </div>
    );
  }

  async function handleAccept() {
    if (!token) return;
    setStatus("accepting");
    setError(null);
    try {
      await acceptInvitation(token, inviteToken!);
      await reload();
      setStatus("accepted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isPermissions = /insufficient.permissions|forbidden|403/i.test(msg);
      setError(
        isPermissions
          ? `This invitation was sent to a different email address. You are signed in as ${user?.email ?? user?.username}. Please sign in with the account that received the invitation.`
          : (msg || t("acceptFailed"))
      );
      setStatus("error");
    }
  }

  async function handleDecline() {
    if (!token) return;
    try {
      await declineInvitation(token, inviteToken!);
      setStatus("declined");
    } catch {
      // Decline failure is non-fatal — just navigate away
      setStatus("declined");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-400 text-sm">
        {t("loading")}
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="max-w-sm mx-auto py-20 text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h1 className="text-lg font-semibold text-stone-800">{t("inviteAccepted")}</h1>
        <p className="text-stone-500 text-sm">{t("inviteAcceptedBody")}</p>
        <button
          onClick={() => router.push(`/${locale}/team`)}
          className="inline-flex items-center bg-violet-700 hover:bg-violet-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          {t("viewTeam")}
        </button>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="max-w-sm mx-auto py-20 text-center space-y-4">
        <p className="text-stone-500 text-sm">{t("inviteDeclined")}</p>
        <Link href={`/${locale}/family`} className="text-sm text-violet-700 hover:underline">
          {t("goHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-20 text-center space-y-6">
      <div className="text-4xl">👥</div>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-stone-800">{t("inviteTitle")}</h1>
        <p className="text-stone-500 text-sm">{t("inviteBody")}</p>
      </div>

      <p className="text-xs text-stone-400">
        Signed in as <span className="font-medium text-stone-600">{user.email ?? user.username}</span>.
        Make sure this matches the email address the invitation was sent to.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 justify-center">
        <button
          onClick={handleDecline}
          disabled={status === "accepting"}
          className="px-5 py-2.5 border border-stone-300 text-stone-600 text-sm rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          {t("decline")}
        </button>
        <button
          onClick={handleAccept}
          disabled={status === "accepting"}
          className="px-5 py-2.5 bg-violet-700 hover:bg-violet-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
        >
          {status === "accepting" ? t("accepting") : t("accept")}
        </button>
      </div>
    </div>
  );
}

export default function TeamInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24 text-stone-400 text-sm">
        Loading…
      </div>
    }>
      <TeamInviteInner />
    </Suspense>
  );
}
