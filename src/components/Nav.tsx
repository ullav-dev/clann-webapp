"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌳</span>
            <span className="font-bold text-xl text-stone-800 tracking-tight">Clann</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/family"
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith("/family") || pathname.startsWith("/persons")
                  ? "text-emerald-700"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              My Family
            </Link>
            <Link
              href="/persons/new"
              className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span>+</span> Add Person
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
