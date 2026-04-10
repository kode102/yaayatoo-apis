import type {RegionalTranslationMap} from "@/lib/i18n-types";
import {CMS_DEFAULT_COUNTRY_KEY} from "@/lib/i18n-types";

/**
 * Indique si un service (traductions régionales) est pertinent pour un pays :
 * bloc pays avec au moins un nom, ou catalogue global `__`.
 */
export function serviceAvailableForCountry(
  translations: RegionalTranslationMap | undefined,
  countryCode: string,
): boolean {
  const cc = countryCode.trim().toUpperCase().slice(0, 2);
  if (!cc || cc === CMS_DEFAULT_COUNTRY_KEY) return true;
  if (!translations || typeof translations !== "object") return false;
  const t = translations as Record<
    string,
    Record<string, {name?: string} | undefined> | undefined
  >;
  const perCountry = t[cc];
  if (perCountry && typeof perCountry === "object") {
    for (const block of Object.values(perCountry)) {
      if (block?.name?.trim()) return true;
    }
  }
  const def = t[CMS_DEFAULT_COUNTRY_KEY];
  if (def && typeof def === "object") {
    for (const block of Object.values(def)) {
      if (block?.name?.trim()) return true;
    }
  }
  return false;
}
