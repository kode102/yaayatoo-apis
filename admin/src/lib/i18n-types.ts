import {uiLocaleFromEditorCode} from "@/lib/ui-locale-constants";

/** Bloc de texte par langue (clé = code locale, ex. fr, en). */
export type TranslationMap = Record<
  string,
  {name?: string; description?: string}
>;

export type ServiceDoc = {
  id: string;
  active: boolean;
  /** URL image (icône / visuel service), optionnelle */
  imageUrl?: string;
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

export function localeFilledCount(translations: TranslationMap | undefined): number {
  if (!translations) return 0;
  return Object.keys(translations).filter((k) => translations[k]?.name?.trim()).length;
}

export function labelForLocale(
  translations: TranslationMap | undefined,
  locale: string,
): string {
  if (!translations || !locale) return "";
  const block = translations[locale] ?? translations[locale.toLowerCase()];
  return (block?.name ?? "").trim();
}

/**
 * Bloc de traduction pour préremplir l’édition : locale exacte, puis base (fr-cm → fr), fr/en, puis premier disponible.
 */
export function translationBlockForEditorLocale(
  translations: TranslationMap | undefined,
  editorLocale: string,
): {name?: string; description?: string} | undefined {
  if (!translations || !editorLocale?.trim()) return undefined;
  const loc = editorLocale.trim().toLowerCase();
  const base = uiLocaleFromEditorCode(editorLocale);

  const keysToTry: string[] = [];
  const push = (k: string) => {
    const n = k.trim().toLowerCase();
    if (n && !keysToTry.includes(n)) keysToTry.push(n);
  };
  push(loc);
  push(base);
  push("fr");
  push("en");

  for (const k of keysToTry) {
    const b = translations[k];
    if (b && (b.name?.trim() || b.description?.trim())) return b;
  }
  return Object.values(translations).find(
    (b) => b?.name?.trim() || b?.description?.trim(),
  );
}

/** Nom à afficher dans le champ édition (même logique que la liste si la clé locale manque). */
export function editNamePrefill(
  translations: TranslationMap | undefined,
  editorLocale: string,
  fallbackId: string,
): string {
  const block = translationBlockForEditorLocale(translations, editorLocale);
  const fromBlock = (block?.name ?? "").trim();
  if (fromBlock) return fromBlock;
  return pickSortLabel(translations, editorLocale, fallbackId);
}

/** Description pour le champ édition service. */
export function editDescriptionPrefill(
  translations: TranslationMap | undefined,
  editorLocale: string,
): string {
  const block = translationBlockForEditorLocale(translations, editorLocale);
  return block?.description ?? "";
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
