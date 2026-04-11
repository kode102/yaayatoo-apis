import {adminFetch, type ApiDocResponse} from "@/lib/api";
import type {CountryDoc, LanguageDoc, LocaleTextDraft, ServiceDoc} from "@/lib/i18n-types";

/**
 * Enchaîne des PUT admin pour fusionner chaque locale (API mergeTranslations).
 * L’image / drapeaux sont envoyés sur la première requête locale qui a lieu,
 * sinon seuls sur une requête dédiée.
 */
export async function persistServiceEditDrafts(
  token: string,
  serviceId: string,
  sortedCountryCodes: string[],
  sortedLocaleCodes: string[],
  drafts: Record<string, Record<string, LocaleTextDraft>>,
  imageUrl: string,
  marketingPatch?: Record<string, unknown>,
): Promise<void> {
  let sentLocale = false;
  for (const country of sortedCountryCodes) {
    for (const loc of sortedLocaleCodes) {
      const d = drafts[country]?.[loc];
      if (!d) continue;
      const name = d.name.trim();
      const description = d.description;
      const hasDesc = description.trim().length > 0;
      if (!name && !hasDesc) continue;

      const body: Record<string, unknown> = {
        locale: loc,
        countryCode: country,
      };
      if (name) body.name = name;
      body.description = description;
      if (!sentLocale) {
        body.imageUrl = imageUrl;
        if (marketingPatch) {
          Object.assign(body, marketingPatch);
        }
      }
      sentLocale = true;
      await adminFetch<ApiDocResponse<ServiceDoc>>(
        `/admin/documents/services/${serviceId}`,
        token,
        {method: "PUT", body: JSON.stringify(body)},
      );
    }
  }
  if (!sentLocale) {
    const body: Record<string, unknown> = {imageUrl};
    if (marketingPatch) {
      Object.assign(body, marketingPatch);
    }
    await adminFetch<ApiDocResponse<ServiceDoc>>(
      `/admin/documents/services/${serviceId}`,
      token,
      {method: "PUT", body: JSON.stringify(body)},
    );
  }
}

export async function persistCountryEditDrafts(
  token: string,
  countryId: string,
  sortedCodes: string[],
  drafts: Record<string, LocaleTextDraft>,
  flagLink: string,
): Promise<void> {
  let sentLocale = false;
  for (const code of sortedCodes) {
    const d = drafts[code];
    if (!d) continue;
    const name = d.name.trim();
    if (!name) continue;

    const body: Record<string, unknown> = {locale: code, name};
    if (!sentLocale) {
      body.flagLink = flagLink;
    }
    sentLocale = true;
    await adminFetch<ApiDocResponse<CountryDoc>>(
      `/admin/documents/countries/${countryId}`,
      token,
      {method: "PUT", body: JSON.stringify(body)},
    );
  }
  if (!sentLocale) {
    await adminFetch<ApiDocResponse<CountryDoc>>(
      `/admin/documents/countries/${countryId}`,
      token,
      {method: "PUT", body: JSON.stringify({flagLink})},
    );
  }
}

export async function persistLanguageEditDrafts(
  token: string,
  languageId: string,
  sortedCountryCodes: string[],
  sortedLocaleCodes: string[],
  drafts: Record<string, Record<string, LocaleTextDraft>>,
  flagIconUrl: string,
): Promise<void> {
  let sentLocale = false;
  for (const country of sortedCountryCodes) {
    for (const loc of sortedLocaleCodes) {
      const d = drafts[country]?.[loc];
      if (!d) continue;
      const name = d.name.trim();
      if (!name) continue;

      const body: Record<string, unknown> = {
        locale: loc,
        countryCode: country,
        name,
      };
      if (!sentLocale) {
        body.flagIconUrl = flagIconUrl;
      }
      sentLocale = true;
      await adminFetch<ApiDocResponse<LanguageDoc>>(
        `/admin/documents/languages/${languageId}`,
        token,
        {method: "PUT", body: JSON.stringify(body)},
      );
    }
  }
  if (!sentLocale) {
    await adminFetch<ApiDocResponse<LanguageDoc>>(
      `/admin/documents/languages/${languageId}`,
      token,
      {method: "PUT", body: JSON.stringify({flagIconUrl})},
    );
  }
}
