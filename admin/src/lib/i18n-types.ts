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

/** Brouillon nom + description par code locale (clé = minuscules). */
export type LocaleTextDraft = {name: string; description: string};

export type LanguageDocLike = {code: string};

/**
 * Préremplit les brouillons pour chaque langue active à partir de `translations`.
 */
export function buildLocaleDraftsFromTranslations(
  translations: TranslationMap | undefined,
  activeLanguages: LanguageDocLike[],
): Record<string, LocaleTextDraft> {
  const out: Record<string, LocaleTextDraft> = {};
  for (const lang of activeLanguages) {
    const code = lang.code.trim().toLowerCase();
    if (!code) continue;
    const b = translations?.[code] ?? translations?.[lang.code.trim()];
    out[code] = {
      name: (b?.name ?? "").trim(),
      description: typeof b?.description === "string" ? b.description : "",
    };
  }
  return out;
}

/** Vrai si au moins une langue a un nom non vide. */
export function hasAnyDraftName(drafts: Record<string, LocaleTextDraft>): boolean {
  return Object.values(drafts).some((d) => d.name.trim().length > 0);
}

export function sortedActiveLanguageCodes(langs: LanguageDocLike[]): string[] {
  return [...langs]
    .map((l) => l.code.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
