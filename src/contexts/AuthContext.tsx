"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { AuthUser, ClannSubscription, LoginResponse } from "@/lib/auth-api";
import { login as apiLogin, decodeClannSubscription } from "@/lib/auth-api";
import { setApiToken } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  roles: string[];
  permissions: string[];
  clannSub: ClannSubscription;
  /** true while restoring session from localStorage (prevents auth flash) */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  /** Used by the SSO page to set session without a page reload */
  setSession: (session: { user: AuthUser; token: string; roles: string[]; permissions?: string[] }) => void;
  /** Update just the user object in state and localStorage (e.g. after a profile edit) */
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  roles: [],
  permissions: [],
  clannSub: { tier: null, status: null, isActive: false },
  isLoading: true,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  setSession: () => {},
  updateUser: () => {},
  logout: () => {},
});

const STORAGE_KEY = "clann_auth";

// Idle timeout — configurable via NEXT_PUBLIC_IDLE_TIMEOUT_MS (milliseconds).
// Defaults to 1 hour. The warning banner appears 60 s before logout.
const IDLE_MS = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS ?? 3_600_000);
const WARN_BEFORE_MS = 60_000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "pointerdown",
  "scroll",
  "touchstart",
] as const;

// ── Idle warning modal ────────────────────────────────────────────────────────

function IdleWarningModal({
  onStay,
  onLogout,
}: {
  onStay: () => void;
  onLogout: () => void;
}) {
  const t = useTranslations("idleWarning");
  const [seconds, setSeconds] = useState(Math.round(WARN_BEFORE_MS / 1000));

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-stone-800 mb-2">
          {t("title")}
        </h2>
        <p className="text-sm text-stone-600 mb-5">
          {t("message", { seconds })}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            {t("logoutNow")}
          </button>
          <button
            type="button"
            onClick={onStay}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
          >
            {t("stayLoggedIn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AuthProvider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [clannSub, setClannSub] = useState<ClannSubscription>({ tier: null, status: null, isActive: false });
  const [isLoading, setIsLoading] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref mirrors idleWarning so activity handlers can read it without needing
  // to be recreated (and re-registered) every time the warning state changes.
  const idleWarningRef = useRef(false);

  // ── Restore session from localStorage ──────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: AuthUser; token: string; roles?: string[]; permissions?: string[] };
        if (!parsed.roles) {
          // Session predates role storage — discard it so the user re-authenticates
          // and gets a fresh session with roles included.
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setUser(parsed.user);
          setToken(parsed.token);
          setRoles(parsed.roles);
          setPermissions(parsed.permissions ?? []);
          setClannSub(decodeClannSubscription(parsed.token));
          setApiToken(parsed.token);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Auth actions ────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRoles([]);
    setPermissions([]);
    setClannSub({ tier: null, status: null, isActive: false });
    setApiToken(null);
    setIdleWarning(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("clann_last_person");
  }, []);

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, user: updated }));
      }
    } catch {}
  }, []);

  const setSession = useCallback((session: { user: AuthUser; token: string; roles: string[]; permissions?: string[] }) => {
    setUser(session.user);
    setToken(session.token);
    setRoles(session.roles);
    setPermissions(session.permissions ?? []);
    setClannSub(decodeClannSubscription(session.token));
    setApiToken(session.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    const resp = await apiLogin(email, password);
    setUser(resp.user);
    setToken(resp.token);
    setRoles(resp.roles);
    setPermissions(resp.permissions);
    setClannSub(decodeClannSubscription(resp.token));
    setApiToken(resp.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: resp.user, token: resp.token, roles: resp.roles, permissions: resp.permissions }));
    return resp;
  }, []);

  // ── Idle timeout ────────────────────────────────────────────────────────────

  const startTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    idleWarningRef.current = false;
    setIdleWarning(false);

    if (IDLE_MS > WARN_BEFORE_MS) {
      warnTimerRef.current = setTimeout(() => {
        idleWarningRef.current = true;
        setIdleWarning(true);
      }, IDLE_MS - WARN_BEFORE_MS);
    }

    logoutTimerRef.current = setTimeout(() => {
      idleWarningRef.current = false;
      setIdleWarning(false);
      logout();
    }, IDLE_MS);
  }, [logout]);

  // Activity handler ignores events while the warning modal is open so the
  // user must make an explicit choice (Stay / Sign Out) rather than having the
  // modal dismissed by an accidental mouse move.
  const handleActivity = useCallback(() => {
    if (!idleWarningRef.current) startTimers();
  }, [startTimers]);

  useEffect(() => {
    if (!user) {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      return;
    }

    startTimers();

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, handleActivity, { passive: true }),
    );

    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [user, startTimers, handleActivity]);

  // ── Server-side 401 → session expired redirect ──────────────────────────────

  const unauthorizedFiredRef = useRef(false);

  useEffect(() => {
    function handleUnauthorized() {
      if (unauthorizedFiredRef.current || !user) return;
      unauthorizedFiredRef.current = true;
      logout();
      router.replace("/login?reason=expired");
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [user, logout, router]);

  // Reset the guard whenever a new session starts so it can fire again
  useEffect(() => {
    if (user) unauthorizedFiredRef.current = false;
  }, [user]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{ user, token, roles, permissions, clannSub, isLoading, login, setSession, updateUser, logout }}>
      {children}
      {idleWarning && (
        <IdleWarningModal onStay={startTimers} onLogout={logout} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
