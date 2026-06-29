"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSubscription,
  updateProfile,
  gravatarUrl,
  changePassword,
  type SubscriptionInfo,
} from "@/lib/auth-api";
import ClannUsageWidget from "@/components/ClannUsageWidget";
import PasswordInput from "@/components/PasswordInput";

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

function AvatarPreview({ url, initials }: { url: string; initials: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (url && !broken) {
    return (
      <img
        src={url}
        alt="Avatar preview"
        className="w-16 h-16 rounded-full object-cover shrink-0"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 text-lg font-semibold flex items-center justify-center select-none shrink-0">
      {initials}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const { user, token, isLoading, updateUser } = useAuth();
  const router = useRouter();

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);

  // Profile editing state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [gravatarLoading, setGravatarLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Redirect to login if not authenticated.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // Populate fields when user loads.
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setAvatarUrl(user.avatar_url ?? "");
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch current subscription once the token is available (failure is silent).
  useEffect(() => {
    if (!token) return;
    getSubscription("clann", token).then(setSub).catch(() => {});
  }, [token]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const payload: Parameters<typeof updateProfile>[0] = {};
      if (firstName.trim() !== (user!.first_name ?? "")) payload.first_name = firstName.trim() || null;
      if (lastName.trim() !== (user!.last_name ?? "")) payload.last_name = lastName.trim() || null;
      const newAvatar = avatarUrl.trim() || null;
      if (newAvatar !== (user!.avatar_url ?? null)) payload.avatar_url = newAvatar;
      const updated = await updateProfile(payload, token);
      updateUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t("profileSaveError"));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleUseGravatar() {
    if (!user) return;
    setGravatarLoading(true);
    try {
      const url = await gravatarUrl(user.email);
      setAvatarUrl(url);
    } finally {
      setGravatarLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !user) return;
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordsMustMatch"));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t("passwordTooShort"));
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(user.id, newPassword, currentPassword, token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t("passwordChangeFailed"));
    } finally {
      setPasswordSaving(false);
    }
  }

  if (isLoading || !user) return null;

  const initials = (
    `${(firstName || user.first_name)?.charAt(0) ?? ""}${(lastName || user.last_name)?.charAt(0) ?? ""}`
  ).toUpperCase() || user.username.charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/family" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          ← {t("backToFamily")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">{t("heading")}</h1>
      <p className="text-sm text-stone-500 mb-8">{t("subheading")}</p>

      {/* Profile section */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-stone-100">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">{t("profileHeading")}</p>
        </div>
        <form onSubmit={handleProfileSave} className="px-6 py-5 space-y-4">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <AvatarPreview url={avatarUrl.trim()} initials={initials} />
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-stone-500 mb-1">{t("avatarUrl")}</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={handleUseGravatar}
                  disabled={gravatarLoading}
                  className="text-xs text-emerald-700 hover:text-emerald-900 transition-colors disabled:opacity-50"
                >
                  {gravatarLoading ? t("gravatarGenerating") : t("useGravatar")}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {t("clearAvatar")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">{t("firstName")}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">{t("lastName")}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {profileSaving ? t("profileSaving") : t("profileSave")}
            </button>
            {profileSaved && (
              <span className="text-sm text-emerald-600 font-medium">{t("profileSaved")}</span>
            )}
            {profileError && (
              <span className="text-sm text-red-600">{profileError}</span>
            )}
          </div>
        </form>
      </div>

      {/* Change password section */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-stone-100">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">{t("changePasswordHeading")}</p>
        </div>
        <form onSubmit={handlePasswordChange} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">{t("currentPassword")}</label>
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">{t("newPassword")}</label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={setNewPassword}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">{t("confirmNewPassword")}</label>
            <PasswordInput
              id="confirm-new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {passwordSaving ? t("changingPassword") : t("changePasswordBtn")}
            </button>
            {passwordSaved && (
              <span className="text-sm text-emerald-600 font-medium">{t("passwordChanged")}</span>
            )}
            {passwordError && (
              <span className="text-sm text-red-600">{passwordError}</span>
            )}
          </div>
        </form>
      </div>

      <div className="mb-6">
        <ClannUsageWidget />
      </div>

      {sub && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
          {/* Plan header */}
          <div className="px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-1">
                {t("currentPlan")}
              </p>
              <p className="text-xl font-bold text-stone-900 capitalize">{sub.plan}</p>
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

        </div>
      )}

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
