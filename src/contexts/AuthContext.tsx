"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { AuthUser, LoginResponse } from "@/lib/auth-api";
import { login as apiLogin } from "@/lib/auth-api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  roles: string[];
  /** true while restoring session from localStorage (prevents auth flash) */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  roles: [],
  isLoading: true,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  logout: () => {},
});

const STORAGE_KEY = "clann_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: AuthUser; token: string; roles?: string[] };
        if (!parsed.roles) {
          // Session predates role storage — discard it so the user re-authenticates
          // and gets a fresh session with roles included.
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setUser(parsed.user);
          setToken(parsed.token);
          setRoles(parsed.roles);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    const resp = await apiLogin(email, password);
    setUser(resp.user);
    setToken(resp.token);
    setRoles(resp.roles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: resp.user, token: resp.token, roles: resp.roles }));
    return resp;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRoles([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, roles, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
