"use client";

import { useState } from "react";
import { inviteMember } from "@/lib/teams-api";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

interface Props {
  teamId: string;
  onClose: () => void;
  onInvited?: () => void;
}

export default function InviteMemberModal({ teamId, onClose, onInvited }: Props) {
  const { token } = useAuth();
  const t = useTranslations("team");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] ?? "en";

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !token) return;
    setSending(true);
    setError(null);
    try {
      const appUrl = `${window.location.origin}/${locale}/auth/team-invite`;
      await inviteMember(token, teamId, email.trim(), appUrl);
      setSent(true);
      onInvited?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("inviteFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-800">{t("inviteMember")}</h2>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              {t("inviteSent", { email })}
            </p>
            <button
              onClick={onClose}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t("emailAddress")}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                autoFocus
              />
              <p className="text-xs text-stone-400 mt-1">{t("inviteNote")}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="flex-1 border border-stone-300 text-stone-600 text-sm py-2 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="flex-1 bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {sending ? t("sending") : t("sendInvite")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
