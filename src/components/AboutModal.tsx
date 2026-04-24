"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { AuthUser } from "@/lib/auth-api";

interface Props {
  user: AuthUser | null;
  roles: string[];
  onClose: () => void;
}

export default function AboutModal({ user, roles, onClose }: Props) {
  const t = useTranslations("about");

  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA ?? "dev";
  const roleLabel = roles.includes("admin") ? t("roleAdmin") : t("roleMember");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-5 flex items-center gap-4">
          <span className="text-4xl leading-none">🌳</span>
          <div>
            <p className="font-bold text-xl text-white leading-tight">Clann</p>
            <p className="text-emerald-200 text-sm">{t("tagline")}</p>
          </div>
        </div>

        {/* Info */}
        <div className="px-6 py-5">
          <dl className="divide-y divide-stone-100">
            <Row label={t("version")} value={`v${version}`} mono={false} />
            <Row label={t("build")} value={gitSha} mono />
            {user && (
              <>
                <Row label={t("user")} value={user.username} mono={false} />
                <Row label={t("role")} value={roleLabel} mono={false} />
              </>
            )}
          </dl>
        </div>

        {/* Links */}
        {user && (
          <div className="px-6 pb-4 flex gap-2">
            <Link
              href="/help"
              onClick={onClose}
              className="flex-1 text-center text-sm font-medium px-3 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              {t("helpLink")}
            </Link>
            <Link
              href="/account/subscription"
              onClick={onClose}
              className="flex-1 text-center text-sm font-medium px-3 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              {t("accountLink")}
            </Link>
          </div>
        )}

        {/* Close */}
        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-700 transition-colors"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-4">
      <dt className="text-sm text-stone-500 shrink-0">{label}</dt>
      <dd className={`text-sm font-medium text-stone-800 truncate text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
