export type UiLocale = "fr" | "en";

export const UI_LOCALE_STORAGE_KEY = "yaayatoo-admin-ui-locale";

/** Code locale stocké (ex. fr, fr-cm, en) — lettre puis a-z, chiffres, _ - */
const STORED_LOCALE_RE = /^[a-z][a-z0-9_-]{0,31}$/;

export function isUiLocale(v: string): v is UiLocale {
  return v === "fr" || v === "en";
}

export function isValidStoredUiLocaleCode(v: string): boolean {
  return STORED_LOCALE_RE.test(v.trim().toLowerCase());
}

/**
 * Langue d’interface admin (FR/EN) dérivée du code Firestore (ex. fr-cm → fr, en → en).
 */
export function uiLocaleFromEditorCode(code: string): UiLocale {
  const c = code.trim().toLowerCase();
  if (c === "en" || c.startsWith("en-")) return "en";
  return "fr";
}
