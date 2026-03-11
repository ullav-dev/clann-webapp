"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { register, confirmEmail, requestPasswordReset, confirmPasswordReset } from "@/lib/auth-api";

type Tab = "login" | "register";
type Stage = "form" | "reset-request" | "reset-confirm";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("login");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Password reset fields
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (regPassword !== regConfirm) return setError("Passwords do not match");
    setSubmitting(true);
    try {
      const { confirmation_token } = await register(regUsername, regEmail, regPassword);
      // Auto-confirm (dev mode returns the token directly)
      await confirmEmail(confirmation_token);
      // Auto-login after confirmation
      await login(regEmail, regPassword);
      router.push("/family");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resp = await requestPasswordReset(resetEmail);
      if (resp.reset_token) {
        setResetToken(resp.reset_token);
        setResetMessage(null);
        setStage("reset-confirm");
      } else {
        setResetMessage(resp.message ?? "If the email is registered you will receive a reset token.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await confirmPasswordReset(resetToken, resetNewPassword);
      setStage("form");
      setTab("login");
      setResetMessage(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  // Password reset flow
  if (stage === "reset-request" || stage === "reset-confirm") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🌳</span>
            <span className="font-bold text-lg text-stone-800">Reset Password</span>
          </div>

          {error && <ErrorBox message={error} />}

          {stage === "reset-request" && (
            <form onSubmit={handleResetRequest} className="space-y-4">
              {resetMessage && (
                <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-4 py-3">{resetMessage}</p>
              )}
              <Field label="Email address" htmlFor="reset-email">
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoFocus
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <SubmitButton loading={submitting} label="Send Reset Token" />
              <button
                type="button"
                onClick={() => { setStage("form"); setError(null); }}
                className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                ← Back to login
              </button>
            </form>
          )}

          {stage === "reset-confirm" && (
            <form onSubmit={handleResetConfirm} className="space-y-4">
              <p className="text-sm text-stone-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                Reset token received. Enter it below along with your new password.
              </p>
              <Field label="Reset Token" htmlFor="reset-token">
                <input
                  id="reset-token"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className={inputCls}
                  placeholder="64-character hex token"
                />
              </Field>
              <Field label="New Password" htmlFor="reset-new-pw">
                <input
                  id="reset-new-pw"
                  type="password"
                  required
                  minLength={8}
                  autoFocus
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <SubmitButton loading={submitting} label="Set New Password" />
              <button
                type="button"
                onClick={() => { setStage("reset-request"); setError(null); }}
                className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Main login / register card
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md p-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🌳</span>
          <span className="font-bold text-lg text-stone-800">Clann</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-stone-200">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                tab === t
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {error && <ErrorBox message={error} />}

        {/* Login form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email" htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <input
                id="login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={inputCls}
              />
            </Field>
            <SubmitButton loading={submitting} label="Sign In" />
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStage("reset-request"); setError(null); }}
                className="text-sm text-stone-500 hover:text-emerald-700 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* Register form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <Field label="Username" htmlFor="reg-username">
              <input
                id="reg-username"
                required
                autoFocus
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className={inputCls}
                placeholder="e.g. alice"
              />
            </Field>
            <Field label="Email" htmlFor="reg-email">
              <input
                id="reg-email"
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Password" htmlFor="reg-password">
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 8 characters"
              />
            </Field>
            <Field label="Confirm Password" htmlFor="reg-confirm">
              <input
                id="reg-confirm"
                type="password"
                required
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                className={inputCls}
              />
            </Field>
            <SubmitButton loading={submitting} label="Create Account" />
          </form>
        )}

        <p className="mt-6 text-center text-xs text-stone-400">
          <Link href="/" className="hover:text-stone-600 transition-colors">← Back to home</Link>
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

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
    >
      {loading ? "Please wait…" : label}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
      {message}
    </div>
  );
}

const inputCls =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm w-full focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
