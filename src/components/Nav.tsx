"use client";

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

  return (
    <header className="bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌳</span>
            <span className="font-bold text-xl text-stone-800 tracking-tight">Clann</span>
          </Link>

          <nav className="flex items-center gap-4">
            {!isLoading && user ? (
              <>
                <Link href="/family" className={activeLink("/family")}>
                  {t("myFamily")}
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
        </div>
      </div>
    </header>
  );
}
