"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";
import {
  isValidStoredUiLocaleCode,
  uiLocaleFromEditorCode,
  type UiLocale,
  UI_LOCALE_STORAGE_KEY,
} from "@/lib/ui-locale-constants";
import {useLayoutEffect} from "react";

const MANIFEST_BY_BASE: Record<UiLocale, string> = {
  fr: "/manifest-fr.webmanifest",
  en: "/manifest-en.webmanifest",
};

function resolveLocale(contextLocale: string): string {
  if (typeof window === "undefined") return contextLocale;
  const raw = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  if (raw && isValidStoredUiLocaleCode(raw)) return raw.trim().toLowerCase();
  return contextLocale;
}

function htmlLangFromCode(code: string): string {
  const c = code.trim().toLowerCase();
  const primary = c.split(/[-_]/)[0] ?? "fr";
  if (/^[a-z]{2,3}$/.test(primary)) return primary;
  return "fr";
}

/** Synchronise <html lang> et le lien manifest PWA avec la langue d’interface. */
export default function AdminDocumentLocale() {
  const {locale} = useUiLocale();

  useLayoutEffect(() => {
    const loc = resolveLocale(locale);
    document.documentElement.lang = htmlLangFromCode(loc);

    const base = uiLocaleFromEditorCode(loc);
    const href = MANIFEST_BY_BASE[base];
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }, [locale]);

  return null;
}
