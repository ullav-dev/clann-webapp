"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam } from "@/contexts/TeamContext";
import { useTree } from "@/contexts/TreeContext";
import { canCreateTeam } from "@/lib/auth-api";
import LocaleSwitcher from "./LocaleSwitcher";
import TreeSelector from "./TreeSelector";
import AboutModal from "./AboutModal";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout, roles, token } = useAuth();
  const { teams, isTeamTree } = useTeam();
  const { activeTree } = useTree();
  const hasTeam = teams.length > 0;
  const showTeam = canCreateTeam(token) || roles.includes("admin");
  const readOnly = !!activeTree && isTeamTree(activeTree.name);
  const t = useTranslations("nav");
  const tTeam = useTranslations("team");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [lastPerson, setLastPerson] = useState<{ id: string; name: string } | null>(null);

  // Read the last-viewed person from localStorage so we can show a quick "back to tree" link.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("clann_last_person");
      if (raw) setLastPerson(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [pathname]); // refresh whenever navigation happens

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function handleLogout() {
    setDropdownOpen(false);
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
    <>
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🌳</span>
              <span className="font-bold text-xl text-stone-800 tracking-tight">Clann</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-4">
              {!isLoading && user ? (
                <>
                  <Link href="/family" className={activeLink("/family")}>
                    {t("myFamily")}
                  </Link>
                  {lastPerson && !pathname.includes(`/persons/${lastPerson.id}`) && (
                    <Link
                      href={`/persons/${lastPerson.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors max-w-36 truncate"
                      title={`Back to ${lastPerson.name}'s family tree`}
                    >
                      🌳 <span className="truncate">{lastPerson.name}</span>
                    </Link>
                  )}
                  <Link href="/research" className={activeLink("/research")}>
                    {t("research")}
                  </Link>
                  {showTeam && (
                    <Link href="/team" className={activeLink("/team")}>
                      {t("team")}
                    </Link>
                  )}
                  <TreeSelector />
                  {readOnly ? (
                    <span
                      title={tTeam("readOnlyTreeHint")}
                      className="inline-flex items-center gap-1 bg-stone-300 text-stone-500 text-sm font-medium px-4 py-2 rounded-lg cursor-not-allowed select-none"
                    >
                      <span>+</span> {t("addPerson")}
                    </span>
                  ) : (
                    <Link
                      href="/persons/new"
                      className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <span>+</span> {t("addPerson")}
                    </Link>
                  )}

                  {/* User dropdown */}
                  <div className="relative pl-2 border-l border-stone-200" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((v) => !v)}
                      className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                      aria-haspopup="true"
                      aria-expanded={dropdownOpen}
                    >
                      <span className="hidden sm:block">{user.username}</span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className={`w-3.5 h-3.5 text-stone-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M4 6l4 4 4-4H4z" />
                      </svg>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-50">
                        <DropdownLink href="/account/subscription" onClick={() => setDropdownOpen(false)}>
                          {t("account")}
                        </DropdownLink>
                        <DropdownLink href="/settings" onClick={() => setDropdownOpen(false)}>
                          {t("settings")}
                        </DropdownLink>
                        <DropdownLink href="/help" onClick={() => setDropdownOpen(false)}>
                          {t("help")}
                        </DropdownLink>
                        <DropdownButton onClick={() => { setDropdownOpen(false); setShowAbout(true); }}>
                          {t("about")}
                        </DropdownButton>
                        <div className="my-1 border-t border-stone-100" />
                        <DropdownButton onClick={handleLogout} destructive>
                          {t("logout")}
                        </DropdownButton>
                      </div>
                    )}
                  </div>
                </>
              ) : !isLoading ? (
                <>
                  <Link href="/pricing" className={activeLink("/pricing")}>
                    {t("pricing")}
                  </Link>
                  <Link href="/help" className={activeLink("/help")}>
                    {t("help")}
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
                </>
              ) : null}
              <LocaleSwitcher />
            </nav>

            {/* Mobile hamburger */}
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
                {hasTeam && (
                  <Link href="/team" onClick={closeMobileMenu} className={mobileLink("/team")}>
                    {t("team")}
                  </Link>
                )}
                <div className="px-4 py-3 border-t border-stone-100">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">{t("activeTree")}</p>
                  <TreeSelector />
                </div>
                <div className="px-4 py-2 border-t border-stone-100">
                  {readOnly ? (
                    <span className="flex items-center justify-center gap-1 w-full bg-stone-300 text-stone-500 text-sm font-medium px-4 py-2.5 rounded-lg cursor-not-allowed select-none">
                      <span>+</span> {t("addPerson")}
                    </span>
                  ) : (
                    <Link
                      href="/persons/new"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center gap-1 w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                    >
                      <span>+</span> {t("addPerson")}
                    </Link>
                  )}
                </div>
                <div className="border-t border-stone-100 mt-2">
                  <Link
                    href="/account/subscription"
                    onClick={closeMobileMenu}
                    className="block px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    {t("account")} ({user.username})
                  </Link>
                  <Link href="/settings" onClick={closeMobileMenu} className={mobileLink("/settings")}>
                    {t("settings")}
                  </Link>
                  <Link href="/help" onClick={closeMobileMenu} className={mobileLink("/help")}>
                    {t("help")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => { closeMobileMenu(); setShowAbout(true); }}
                    className="block w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    {t("about")}
                  </button>
                  <button
                    onClick={() => { closeMobileMenu(); handleLogout(); }}
                    className="block w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {t("logout")}
                  </button>
                </div>
                <div className="border-t border-stone-100 px-4 py-3">
                  <LocaleSwitcher />
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

      {showAbout && (
        <AboutModal user={user} roles={roles} onClose={() => setShowAbout(false)} />
      )}
    </>
  );
}

function DropdownLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
    >
      {children}
    </Link>
  );
}

function DropdownButton({
  onClick,
  destructive = false,
  children,
}: {
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-stone-700 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}
