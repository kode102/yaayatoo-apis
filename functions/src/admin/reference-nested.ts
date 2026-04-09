/**
 * Services / langues : même schéma imbriqué que le CMS (pays → locale → bloc).
 */

import type {DocumentData} from "firebase-admin/firestore";
import {
  isNestedCountryLocaleTranslations,
  toNestedCmsTranslations,
  type CmsNestedTranslations,
} from "./cms-translations.js";
import {
  normalizeLegacyLanguageTranslations,
  normalizeLegacyServiceTranslations,
} from "./i18n.js";

/**
 * @param {DocumentData} data Document Firestore `services`.
 * @return {CmsNestedTranslations} Traductions normalisées pays → locale.
 */
export function serviceDocToNested(data: DocumentData): CmsNestedTranslations {
  const raw = data.translations;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const t = raw as Record<string, unknown>;
    if (isNestedCountryLocaleTranslations(t)) {
      return toNestedCmsTranslations(t);
    }
  }
  const flat = normalizeLegacyServiceTranslations(data);
  return toNestedCmsTranslations(flat);
}

/**
 * @param {DocumentData} data Document Firestore `languages`.
 * @return {CmsNestedTranslations} Traductions normalisées pays → locale.
 */
export function languageDocToNested(data: DocumentData): CmsNestedTranslations {
  const raw = data.translations;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const t = raw as Record<string, unknown>;
    if (isNestedCountryLocaleTranslations(t)) {
      return toNestedCmsTranslations(t);
    }
  }
  const flat = normalizeLegacyLanguageTranslations(data);
  return toNestedCmsTranslations(flat);
}
