/**
 * Lecture normalisée des documents Firestore `adminUiDictionary`.
 */

const UI_DICT_LOCALE_KEY = /^[a-z][a-z0-9_-]{0,31}$/;

/** @param {string} raw Clé locale brute. @return {string|null} Normalisée ou null. */
export function normUiDictLocaleKey(raw: string): string | null {
  const k = raw.trim().toLowerCase();
  if (!UI_DICT_LOCALE_KEY.test(k)) return null;
  return k;
}

/**
 * @param {Record<string, unknown>} data Données document.
 * @return {Record<string, string>} locale → texte.
 */
export function readUiDictionaryTranslations(
  data: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const tr = data.translations;
  if (tr && typeof tr === "object" && !Array.isArray(tr)) {
    for (const [k, v] of Object.entries(tr as Record<string, unknown>)) {
      const nk = normUiDictLocaleKey(k);
      if (nk && typeof v === "string") out[nk] = v;
    }
  }
  if (typeof data.fr === "string" && out.fr === undefined) out.fr = data.fr;
  if (typeof data.en === "string" && out.en === undefined) out.en = data.en;
  return out;
}
