/** Bloc de texte par langue (clé = code locale, ex. fr, en). */
export type TranslationMap = Record<
  string,
  {name?: string; description?: string}
>;

export type ServiceDoc = {
  id: string;
  active: boolean;
  translations: TranslationMap;
  createdAt?: string;
  updatedAt?: string;
};

export type CountryDoc = {
  id: string;
  code: string;
  flagLink: string;
  active: boolean;
  translations: TranslationMap;
  createdAt?: string;
  updatedAt?: string;
};

export type LanguageDoc = {
  id: string;
  code: string;
  flagIconUrl: string;
  active: boolean;
  translations: TranslationMap;
  createdAt?: string;
  updatedAt?: string;
};

export function labelForLocale(
  translations: TranslationMap | undefined,
  locale: string,
): string {
  if (!translations || !locale) return "";
  const block = translations[locale] ?? translations[locale.toLowerCase()];
  return (block?.name ?? "").trim();
}

export function pickSortLabel(
  translations: TranslationMap | undefined,
  locale: string,
  fallback: string,
): string {
  const a = labelForLocale(translations, locale);
  if (a) return a;
  const first = translations ? Object.values(translations).find((b) => b?.name?.trim()) : undefined;
  return first?.name?.trim() || fallback;
}
