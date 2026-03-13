"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { confirmEmail } from "@/lib/auth-api";

export default function ConfirmEmailPage() {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    confirmEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8 text-center">
        <div className="text-4xl mb-4">
          {status === "pending" ? "⏳" : status === "success" ? "✅" : "❌"}
        </div>
        <h1 className="font-bold text-lg text-stone-800 mb-2">{t("confirmEmailTitle")}</h1>
        {status === "pending" && (
          <p className="text-stone-500 text-sm">{t("confirmEmailVerifying")}</p>
        )}
        {status === "success" && (
          <>
            <p className="text-emerald-700 text-sm mb-6">{t("confirmEmailSuccess")}</p>
            <Link
              href="/login"
              className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              {t("confirmEmailSignIn")}
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-600 text-sm mb-6">{t("confirmEmailFailed")}</p>
            <Link
              href="/login"
              className="inline-block text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              {t("confirmEmailBackToLogin")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
