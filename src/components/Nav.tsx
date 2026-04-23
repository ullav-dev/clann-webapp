"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import LocaleSwitcher from "./LocaleSwitcher";
import TreeSelector from "./TreeSelector";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  const activeLink = (path: string) =>
    `text-sm font-medium transition-colors ${
      pathname.includes(path)
        ? "text-emerald-700"
        : "text-stone-600 hover:text-stone-900"
    }`;

  const mobileLink = (path: string) =>
    `block px-4 py-3 text-base font-medium transition-colors ${
      pathname.includes(path)
        ? "text-emerald-700 bg-emerald-50"
        : "text-stone-700 hover:bg-stone-50"
    }`;

  return (
    <header className="bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌳</span>
            <span className="font-bold text-xl text-stone-800 tracking-tight">Clann</span>
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-4">
            {!isLoading && user ? (
              <>
                <Link href="/family" className={activeLink("/family")}>
                  {t("myFamily")}
                </Link>
                <Link href="/research" className={activeLink("/research")}>
                  {t("research")}
                </Link>
                <TreeSelector />
                <Link
                  href="/persons/new"
                  className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <span>+</span> {t("addPerson")}
                </Link>
                <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                  <Link
                    href="/account/subscription"
                    className="text-sm text-stone-500 hover:text-stone-700 hidden sm:block transition-colors"
                    title={t("account")}
                  >
                    {user.username}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    {t("logout")}
                  </button>
                </div>
                <Link href="/help" className={activeLink("/help")}>
                  {t("help")}
                </Link>
              </>
            ) : !isLoading ? (
              <>
                <Link href="/pricing" className={activeLink("/pricing")}>
                  {t("pricing")}
                </Link>
                <Link
                  href="/login"
                  className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                    pathname.endsWith("/login")
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                      : "border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {t("login")}
                </Link>
                <Link href="/help" className={activeLink("/help")}>
                  {t("help")}
                </Link>
              </>
            ) : null}
            <LocaleSwitcher />
          </nav>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white">
          {!isLoading && user ? (
            <div className="py-2">
              <Link href="/family" onClick={closeMobileMenu} className={mobileLink("/family")}>
                {t("myFamily")}
              </Link>
              <Link href="/research" onClick={closeMobileMenu} className={mobileLink("/research")}>
                {t("research")}
              </Link>
              <div className="px-4 py-3 border-t border-stone-100">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">{t("activeTree")}</p>
                <TreeSelector />
              </div>
              <div className="px-4 py-2 border-t border-stone-100">
                <Link
                  href="/persons/new"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-1 w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  <span>+</span> {t("addPerson")}
                </Link>
              </div>
              <div className="border-t border-stone-100 mt-2">
                <Link
                  href="/account/subscription"
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  {user.username}
                </Link>
                <button
                  onClick={() => { closeMobileMenu(); handleLogout(); }}
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  {t("logout")}
                </button>
              </div>
              <div className="border-t border-stone-100">
                <Link href="/help" onClick={closeMobileMenu} className={mobileLink("/help")}>
                  {t("help")}
                </Link>
                <div className="px-4 py-3">
                  <LocaleSwitcher />
                </div>
              </div>
            </div>
          ) : !isLoading ? (
            <div className="py-2">
              <Link href="/pricing" onClick={closeMobileMenu} className={mobileLink("/pricing")}>
                {t("pricing")}
              </Link>
              <div className="px-4 py-2">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className={`flex items-center justify-center w-full text-sm font-medium px-4 py-2.5 rounded-lg border transition-colors ${
                    pathname.endsWith("/login")
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                      : "border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {t("login")}
                </Link>
              </div>
              <Link href="/help" onClick={closeMobileMenu} className={mobileLink("/help")}>
                {t("help")}
              </Link>
              <div className="px-4 py-3 border-t border-stone-100">
                <LocaleSwitcher />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}
