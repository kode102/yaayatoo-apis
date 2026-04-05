import type {DocumentData} from "firebase-admin/firestore";

/** Locale par défaut pour données historiques sans `translations`. */
export const DEFAULT_LOCALE = "fr";

/**
 * Normalise un code locale (minuscules, tirets).
 * @param {string} s Entrée.
 * @return {string} Code normalisé.
 */
export function normLocale(s: string): string {
  return String(s || "").trim().toLowerCase().replace(/_/g, "-");
}

export type TranslationBlock = {name?: string; description?: string};

export type TranslationsMap = Record<string, TranslationBlock>;

/**
 * Fusionne un bloc de traduction pour une locale.
 * @param {TranslationsMap} existing Carte existante.
 * @param {string} locale Code locale.
 * @param {TranslationBlock} partial Champs à fusionner.
 * @return {TranslationsMap} Nouvelle carte.
 */
export function mergeTranslations(
  existing: TranslationsMap,
  locale: string,
  partial: TranslationBlock,
): TranslationsMap {
  const loc = normLocale(locale);
  const next: TranslationsMap = {...existing};
  next[loc] = {...(next[loc] || {}), ...partial};
  return next;
}

/**
 * Lit translations depuis un document Firestore.
 * @param {DocumentData} data Données brutes.
 * @return {TranslationsMap} Carte (peut être vide).
 */
export function readTranslations(data: DocumentData): TranslationsMap {
  const t = data.translations;
  if (!t || typeof t !== "object") return {};
  return {...(t as TranslationsMap)};
}

/**
 * Legacy : name/description à la racine → translations[DEFAULT_LOCALE].
 * @param {DocumentData} data Données brutes.
 * @return {TranslationsMap} Carte enrichie.
 */
export function normalizeLegacyServiceTranslations(
  data: DocumentData,
): TranslationsMap {
  const tr = readTranslations(data);
  const name = data.name;
  const desc = data.description;
  if (typeof name === "string" && name.trim()) {
    const cur = tr[DEFAULT_LOCALE] || {};
    if (!cur.name?.trim()) {
      tr[DEFAULT_LOCALE] = {
        name: name.trim(),
        description:
          typeof desc === "string" ? desc : (cur.description ?? ""),
      };
    }
  }
  return tr;
}

/**
 * Legacy : name pays à la racine.
 * @param {DocumentData} data Données brutes.
 * @return {TranslationsMap} Carte enrichie.
 */
export function normalizeLegacyCountryTranslations(
  data: DocumentData,
): TranslationsMap {
  const tr = readTranslations(data);
  const name = data.name;
  if (typeof name === "string" && name.trim()) {
    const cur = tr[DEFAULT_LOCALE] || {};
    if (!cur.name?.trim()) {
      tr[DEFAULT_LOCALE] = {name: name.trim()};
    }
  }
  return tr;
}

/**
 * Legacy : champ language (libellé) à la racine.
 * @param {DocumentData} data Données brutes.
 * @return {TranslationsMap} Carte enrichie.
 */
export function normalizeLegacyLanguageTranslations(
  data: DocumentData,
): TranslationsMap {
  const tr = readTranslations(data);
  const name = data.language ?? data.name;
  if (typeof name === "string" && name.trim()) {
    const cur = tr[DEFAULT_LOCALE] || {};
    if (!cur.name?.trim()) {
      tr[DEFAULT_LOCALE] = {name: name.trim()};
    }
  }
  return tr;
}

/**
 * Libellé de tri / affichage.
 * @param {TranslationsMap} tr Traductions.
 * @param {string} locale Locale préférée.
 * @param {string} fallback Valeur de repli.
 * @return {string} Texte pour tri.
 */
export function pickSortLabel(
  tr: TranslationsMap,
  locale: string,
  fallback: string,
): string {
  const loc = normLocale(locale);
  const n = tr[loc]?.name?.trim();
  if (n) return n;
  for (const block of Object.values(tr)) {
    const x = block?.name?.trim();
    if (x) return x;
  }
  return fallback;
}
