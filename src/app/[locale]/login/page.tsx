"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { register, requestPasswordReset } from "@/lib/auth-api";

type Tab = "login" | "register";
type Stage = "form" | "verify-email" | "reset-request";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const t = useTranslations("login");

  const [tab, setTab] = useState<Tab>("login");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/family");
  }, [isLoading, user, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      router.push("/family");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (regPassword !== regConfirm) return setError(t("passwordsDoNotMatch"));
    setSubmitting(true);
    try {
      await register(regUsername, regEmail, regPassword);
      setPendingEmail(regEmail);
      setStage("verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registrationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(resetEmail);
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  if (stage === "verify-email") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="font-bold text-lg text-stone-800 mb-2">{t("verifyEmailTitle")}</h1>
          <p className="text-sm text-stone-600 mb-6">
            {t("verifyEmailMessage", { email: pendingEmail })}
          </p>
          {error && <ErrorBox message={error} />}
          <button
            type="button"
            onClick={() => { setStage("form"); setError(null); }}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {t("backToLogin")}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "reset-request") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🌳</span>
            <span className="font-bold text-lg text-stone-800">{t("resetPassword")}</span>
          </div>
          {error && <ErrorBox message={error} />}
          {resetSent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <p className="text-sm text-stone-600">{t("resetTokenMessage")}</p>
              <button type="button" onClick={() => { setStage("form"); setError(null); setResetSent(false); }} className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
                {t("backToLogin")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <Field label={t("emailAddress")} htmlFor="reset-email">
                <input id="reset-email" type="email" required autoFocus value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className={inputCls} />
              </Field>
              <SubmitButton loading={submitting} label={t("sendResetToken")} pleaseWait={t("pleaseWait")} />
              <button type="button" onClick={() => { setStage("form"); setError(null); }} className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors">
                {t("backToLogin")}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🌳</span>
          <span className="font-bold text-lg text-stone-800">Clann</span>
        </div>
        <div className="flex gap-1 mb-6 border-b border-stone-200">
          {(["login", "register"] as Tab[]).map((tabKey) => (
            <button key={tabKey} onClick={() => { setTab(tabKey); setError(null); }}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${tab === tabKey ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-500 hover:text-stone-700"}`}>
              {tabKey === "login" ? t("signIn") : t("createAccount")}
            </button>
          ))}
        </div>
        {error && <ErrorBox message={error} />}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label={t("email")} htmlFor="login-email">
              <input id="login-email" type="email" required autoFocus value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("password")} htmlFor="login-password">
              <input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputCls} />
            </Field>
            <SubmitButton loading={submitting} label={t("signIn")} pleaseWait={t("pleaseWait")} />
            <div className="text-center">
              <button type="button" onClick={() => { setStage("reset-request"); setError(null); }} className="text-sm text-stone-500 hover:text-emerald-700 transition-colors">
                {t("forgotPassword")}
              </button>
            </div>
          </form>
        )}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <Field label={t("username")} htmlFor="reg-username">
              <input id="reg-username" required autoFocus value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className={inputCls} placeholder={t("usernamePlaceholder")} />
            </Field>
            <Field label={t("email")} htmlFor="reg-email">
              <input id="reg-email" type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("password")} htmlFor="reg-password">
              <input id="reg-password" type="password" required minLength={8} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputCls} placeholder={t("passwordPlaceholder")} />
            </Field>
            <Field label={t("confirmPassword")} htmlFor="reg-confirm">
              <input id="reg-confirm" type="password" required value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} className={inputCls} />
            </Field>
            <SubmitButton loading={submitting} label={t("createAccount")} pleaseWait={t("pleaseWait")} />
          </form>
        )}
        <p className="mt-6 text-center text-xs text-stone-400">
          <Link href="/" className="hover:text-stone-600 transition-colors">{t("backToHome")}</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-stone-700">{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, label, pleaseWait }: { loading: boolean; label: string; pleaseWait: string }) {
  return (
    <button type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors">
      {loading ? pleaseWait : label}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{message}</div>
  );
}

const inputCls = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm w-full focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
