/**
 * CMS sections : traductions par pays puis par langue.
 * Forme stockée : { [countryCode]: { [locale]: CmsLocaleBlock } }
 * - countryCode : ISO 3166-1 alpha-2 majuscules (ex. CM, FR) ou "__" = défaut / tous pays.
 * Legacy : { fr: {...}, en: {...} } (locale au premier niveau) → traité comme { __: { fr, en } }.
 */

import type {DocumentData} from "firebase-admin/firestore";
import {
  normLocale,
  type TranslationBlock,
  type TranslationsMap,
} from "./i18n.js";

/** Pays « global » : texte par défaut quand aucune variante pays n’est définie. */
export const CMS_DEFAULT_COUNTRY = "__";

const LOCALE_KEY_RE = /^[a-z]{2}(-[a-z0-9]+)?$/;

/**
 * @param {unknown} key Clé racine de `translations`.
 * @return {boolean} True si la clé ressemble à un code locale (legacy).
 */
export function isLikelyLocaleKey(key: string): boolean {
  return LOCALE_KEY_RE.test(key.trim().toLowerCase());
}

/**
 * Détecte l’ancien format (locale → bloc) vs pays → locale → bloc.
 * @param {Record<string, unknown>} t Champ translations brut.
 * @return {boolean} True si uniquement des locales au premier niveau.
 */
export function isLegacyFlatCmsTranslations(
  t: Record<string, unknown>,
): boolean {
  const keys = Object.keys(t);
  if (keys.length === 0) return true;
  return keys.every((k) => isLikelyLocaleKey(k));
}

/**
 * @param {string} raw Code pays ou "__".
 * @return {string} "__" ou ISO2 majuscules.
 */
export function normCmsCountryCode(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s || s === CMS_DEFAULT_COUNTRY) return CMS_DEFAULT_COUNTRY;
  const up = s.toUpperCase().replace(/[^A-Z]/g, "");
  if (up.length === 2) return up;
  return CMS_DEFAULT_COUNTRY;
}

export type CmsNestedTranslations = Record<string, TranslationsMap>;

/**
 * Normalise le champ translations Firestore vers la forme imbriquée.
 * @param {unknown} raw Objet translations.
 * @return {CmsNestedTranslations} Toujours pays → locale → bloc.
 */
export function toNestedCmsTranslations(raw: unknown): CmsNestedTranslations {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {[CMS_DEFAULT_COUNTRY]: {}};
  }
  const t = raw as Record<string, unknown>;
  if (isLegacyFlatCmsTranslations(t)) {
    const map: TranslationsMap = {};
    for (const [k, v] of Object.entries(t)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        map[normLocale(k)] = v as TranslationBlock;
      }
    }
    return {[CMS_DEFAULT_COUNTRY]: map};
  }
  const out: CmsNestedTranslations = {};
  for (const [country, locales] of Object.entries(t)) {
    if (!locales || typeof locales !== "object" || Array.isArray(locales)) {
      continue;
    }
    const cc = normCmsCountryCode(country);
    const lm: TranslationsMap = {};
    for (const [loc, block] of Object.entries(locales as Record<string, unknown>)) {
      if (block && typeof block === "object" && !Array.isArray(block)) {
        lm[normLocale(loc)] = block as TranslationBlock;
      }
    }
    out[cc] = lm;
  }
  return Object.keys(out).length > 0 ? out : {[CMS_DEFAULT_COUNTRY]: {}};
}

/**
 * @param {DocumentData} data Document Firestore.
 * @return {CmsNestedTranslations} Forme imbriquée.
 */
export function readNestedCmsFromDoc(data: DocumentData): CmsNestedTranslations {
  return toNestedCmsTranslations(data.translations);
}

const CMS_FIELDS = [
  "name",
  "description",
  "metaKeyword",
  "metaAuthor",
  "metaDescription",
  "facebookLink",
  "twitterLink",
  "linkedinLink",
  "skypeLink",
  "instagramLink",
  "youtubeLink",
  "footerLeftText",
  "section1Title",
  "section1Items",
  "section2Title",
  "section2Items",
  "readMoreLabel",
] as const;

/**
 * Fusionne un bloc champs pour (pays, locale).
 * @param {CmsNestedTranslations} nested Carte existante.
 * @param {string} country Code pays normalisé.
 * @param {string} locale Locale normalisée.
 * @param {Record<string, string>} block Champs fournis.
 * @return {CmsNestedTranslations} Nouvelle carte.
 */
export function mergeCmsNestedLocaleBlock(
  nested: CmsNestedTranslations,
  country: string,
  locale: string,
  block: Record<string, string>,
): CmsNestedTranslations {
  const c = normCmsCountryCode(country);
  const loc = normLocale(locale);
  const prevCountry: TranslationsMap = {...(nested[c] || {})};
  const prevBlock = prevCountry[loc] || {};
  const prevObj = prevBlock as Record<string, unknown>;
  const nextFields: Record<string, string> = {};
  for (const f of CMS_FIELDS) {
    const incoming = block[f];
    const old =
      typeof prevObj[f] === "string" ? String(prevObj[f]) : "";
    nextFields[f] = incoming ?? old;
  }
  return {
    ...nested,
    [c]: {
      ...prevCountry,
      [loc]: nextFields as TranslationBlock,
    },
  };
}

/**
 * Aplatit pour tri / libellé (utilise __ puis premier pays ayant des entrées).
 * @param {CmsNestedTranslations} nested Carte imbriquée.
 * @return {TranslationsMap} locale → bloc pour pickSortLabel.
 */
export function flattenCmsForSort(nested: CmsNestedTranslations): TranslationsMap {
  if (nested[CMS_DEFAULT_COUNTRY] && Object.keys(nested[CMS_DEFAULT_COUNTRY]).length) {
    return nested[CMS_DEFAULT_COUNTRY]!;
  }
  for (const [k, map] of Object.entries(nested)) {
    if (k !== CMS_DEFAULT_COUNTRY && map && Object.keys(map).length > 0) {
      return map;
    }
  }
  return {};
}

/**
 * Résout le bloc affichage pour un pays + locale (API publique).
 * @param {CmsNestedTranslations} nested Données normalisées.
 * @param {string} countryCode Pays demandé (ISO2).
 * @param {string} locale Locale demandée.
 * @return {TranslationsMap[string]|undefined} Bloc ou undefined.
 */
export function resolveCmsBlock(
  nested: CmsNestedTranslations,
  countryCode: string,
  locale: string,
): TranslationBlock | undefined {
  const loc = normLocale(locale);
  const cc = normCmsCountryCode(countryCode);
  if (cc !== CMS_DEFAULT_COUNTRY) {
    const per = nested[cc]?.[loc];
    if (per && typeof per === "object") return per;
  }
  const def = nested[CMS_DEFAULT_COUNTRY]?.[loc];
  if (def && typeof def === "object") return def;
  const anyCountry = nested[cc];
  if (anyCountry) {
    const hit = anyCountry[loc];
    if (hit && typeof hit === "object") return hit;
  }
  for (const map of Object.values(nested)) {
    const b = map[loc];
    if (b && typeof b === "object") return b;
  }
  return undefined;
}
