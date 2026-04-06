"use client";

// SSO handoff page — called by ullav-portal when launching this app.
// URL format: /en/auth/sso?t=<encoded-session>
//
// The encoded session is JSON: { token, user, roles }
// We call setSession() from AuthContext (which sets React state + localStorage)
// so that the idle timeout timers start immediately without a page reload.

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import type { AuthUser } from "@/lib/auth-api";
import { useAuth } from "@/contexts/AuthContext";

function SsoHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();

  useEffect(() => {
    const raw = searchParams.get("t");
    if (!raw) {
      router.replace("/login");
      return;
    }
    try {
      const session = JSON.parse(decodeURIComponent(raw)) as {
        token: string;
        user: AuthUser;
        roles: string[];
      };
      if (!session.token || !session.user || !session.roles) throw new Error("invalid");
      setSession(session);
      router.replace("/family");
    } catch {
      router.replace("/login");
    }
  }, [searchParams, router, setSession]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-stone-400 text-sm">Signing you in…</p>
    </div>
  );
}

export default function SsoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-400 text-sm">Signing you in…</p>
      </div>
    }>
      <SsoHandler />
    </Suspense>
  );
}
