"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { confirmPasswordReset } from "@/lib/auth-api";

function PasswordResetContent() {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🌳</span>
        <span className="font-bold text-lg text-stone-800">{t("resetPassword")}</span>
      </div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-password" className="text-sm font-medium text-stone-700">{t("newPassword")}</label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm w-full focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="confirm-password" className="text-sm font-medium text-stone-700">{t("confirmPassword")}</label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm w-full focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !token}
          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {submitting ? t("pleaseWait") : t("setNewPassword")}
        </button>
        <div className="text-center">
          <Link href="/login" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            {t("backToLogin")}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function PasswordResetPage() {
  const t = useTranslations("login");
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Suspense fallback={
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8 text-center">
          <p className="text-stone-500 text-sm">{t("pleaseWait")}</p>
        </div>
      }>
        <PasswordResetContent />
      </Suspense>
    </div>
  );
}
