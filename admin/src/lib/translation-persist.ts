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
  sortedCodes: string[],
  drafts: Record<string, LocaleTextDraft>,
  imageUrl: string,
): Promise<void> {
  let sentLocale = false;
  for (const code of sortedCodes) {
    const d = drafts[code];
    if (!d) continue;
    const name = d.name.trim();
    const description = d.description;
    const hasDesc = description.trim().length > 0;
    if (!name && !hasDesc) continue;

    const body: Record<string, unknown> = {locale: code};
    if (name) body.name = name;
    body.description = description;
    if (!sentLocale) {
      body.imageUrl = imageUrl;
    }
    sentLocale = true;
    await adminFetch<ApiDocResponse<ServiceDoc>>(
      `/admin/documents/services/${serviceId}`,
      token,
      {method: "PUT", body: JSON.stringify(body)},
    );
  }
  if (!sentLocale) {
    await adminFetch<ApiDocResponse<ServiceDoc>>(
      `/admin/documents/services/${serviceId}`,
      token,
      {method: "PUT", body: JSON.stringify({imageUrl})},
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
  sortedCodes: string[],
  drafts: Record<string, LocaleTextDraft>,
  flagIconUrl: string,
): Promise<void> {
  let sentLocale = false;
  for (const code of sortedCodes) {
    const d = drafts[code];
    if (!d) continue;
    const name = d.name.trim();
    if (!name) continue;

    const body: Record<string, unknown> = {locale: code, name};
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
  if (!sentLocale) {
    await adminFetch<ApiDocResponse<LanguageDoc>>(
      `/admin/documents/languages/${languageId}`,
      token,
      {method: "PUT", body: JSON.stringify({flagIconUrl})},
    );
  }
}
