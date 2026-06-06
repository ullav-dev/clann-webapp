import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { TreeProvider } from "@/contexts/TreeContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

const geist = Geist({ subsets: ["latin"] });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Silently fall back without crashing if locale is invalid
  const validLocale = routing.locales.includes(locale as never) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: validLocale, namespace: "landing" });
  return {
    title: "Clann – Family Tree",
    description: t("heroDescription"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `window.__ENV__=${JSON.stringify({ DAM_BROWSER_URL: process.env.DAM_BROWSER_URL ?? "https://comad.ullav.com" })}` }} />
      </head>
      <body className={`${geist.className} bg-stone-50 text-stone-900 min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <SubscriptionProvider>
              <TreeProvider>
                <TeamProvider>
                  <ConfirmProvider>
                    <Nav />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
                    <Footer />
                  </ConfirmProvider>
                </TeamProvider>
              </TreeProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
