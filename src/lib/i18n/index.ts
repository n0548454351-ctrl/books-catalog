"use client";
// src/lib/i18n/index.ts
// ─────────────────────────────────────────────────────────────────
// Minimal i18n without next-intl or any extra package.
// Language stored in cookie "lang" (he | en).
// SSR-safe: reads cookie on server, reads cookie on client.
// ─────────────────────────────────────────────────────────────────

import { translations, type Locale, type Translations } from "./translations";
import { useEffect, useState } from "react";

export { translations };
export type { Locale, Translations };

// ── Server-side: read locale from cookie string ───────────────────
export function getLocaleFromCookieStr(cookieStr: string): Locale {
  const match = cookieStr.match(/(?:^|;\s*)lang=(he|en)/);
  return (match?.[1] as Locale) ?? "he";
}

// ── Client hook ───────────────────────────────────────────────────
export function useLocale(): {
  locale: Locale;
  t: Translations;
  toggle: () => void;
  isEn: boolean;
} {
  const [locale, setLocale] = useState<Locale>("he");

  useEffect(() => {
    const stored = document.cookie.match(/(?:^|;\s*)lang=(he|en)/)?.[1] as Locale;
    if (stored) setLocale(stored);
  }, []);

  function toggle() {
    const next: Locale = locale === "he" ? "en" : "he";
    document.cookie = `lang=${next};path=/;max-age=31536000;SameSite=Lax`;
    setLocale(next);
    // Update html dir + lang without full reload
    document.documentElement.lang = next;
    document.documentElement.dir  = next === "he" ? "rtl" : "ltr";
  }

  return {
    locale,
    t:    translations[locale],
    toggle,
    isEn: locale === "en",
  };
}

// ── Server-side helper (for Server Components) ────────────────────
// Usage: import { getT } from "@/lib/i18n"; const t = getT("he");
export function getT(locale: Locale): Translations {
  return translations[locale];
}

// ── Dir helper ────────────────────────────────────────────────────
export function getDir(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}
