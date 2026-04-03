"use client";

// SSO handoff page — called by ullav-portal when launching this app.
// URL format: /en/auth/sso?t=<encoded-session>
//
// The encoded session is JSON: { token, user, roles }
// We write it straight into localStorage (same key as the normal login flow)
// and redirect to the app home page.

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import type { AuthUser } from "@/lib/auth-api";

const STORAGE_KEY = "clann_auth";

function SsoHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      router.replace("/family");
    } catch {
      router.replace("/login");
    }
  }, [searchParams, router]);

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
