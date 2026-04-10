import {uiLocaleFromEditorCode} from "@/lib/ui-locale-constants";

/** Bloc de texte par langue (clé = code locale, ex. fr, en). */
export type TranslationMap = Record<
  string,
  {name?: string; description?: string}
>;

/**
 * Traductions par pays puis par langue (services, langues, CMS).
 * Clé pays : ISO2 majuscules ou `__` (défaut / tous pays).
 */
export type RegionalTranslationMap = Record<string, TranslationMap>;

export type ServiceDoc = {
  id: string;
  active: boolean;
  /** URL image (icône / visuel service), optionnelle */
  imageUrl?: string;
  translations: RegionalTranslationMap;
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
  translations: RegionalTranslationMap;
  createdAt?: string;
  updatedAt?: string;
};

export type CmsLocaleBlock = {
  name?: string;
  description?: string;
  metaKeyword?: string;
  metaAuthor?: string;
  metaDescription?: string;
  facebookLink?: string;
  twitterLink?: string;
  linkedinLink?: string;
  skypeLink?: string;
  instagramLink?: string;
  youtubeLink?: string;
  footerLeftText?: string;
  /** Bloc « Pourquoi nous choisir » : une ligne = une puce */
  section1Title?: string;
  section1Items?: string;
  section2Title?: string;
  section2Items?: string;
  readMoreLabel?: string;
};

export type CmsTranslationMap = Record<string, CmsLocaleBlock>;

/**
 * Traductions CMS par pays puis par langue.
 * Clé pays : ISO 3166-1 alpha-2 majuscules (CM, FR) ou `__` = défaut / tous pays.
 */
export type CmsTranslationsByCountry = Record<string, CmsTranslationMap>;

/** Clé Firestore/API pour le contenu « tous pays » / héritage. */
export const CMS_DEFAULT_COUNTRY_KEY = "__";

/**
 * Bloc pour un couple pays + langue (données API déjà normalisées pays → locale).
 */
export function getCmsLocaleBlock(
  translations: CmsTranslationsByCountry | undefined,
  countryCode: string,
  locale: string,
): CmsLocaleBlock | undefined {
  if (!translations || typeof translations !== "object") return undefined;
  const loc = locale.trim().toLowerCase();
  const cc =
    !countryCode.trim() || countryCode.trim() === CMS_DEFAULT_COUNTRY_KEY
      ? CMS_DEFAULT_COUNTRY_KEY
      : countryCode.trim().toUpperCase().slice(0, 2);
  const per = translations[cc]?.[loc];
  if (per) return per;
  return translations[CMS_DEFAULT_COUNTRY_KEY]?.[loc];
}

/** Libellé de section CMS (liste / en-tête) : priorité pays défaut + locale, puis autres pays, puis premier nom trouvé. */
export function pickSortLabelCms(
  translations: CmsTranslationsByCountry | undefined,
  locale: string,
  fallback: string,
): string {
  if (!translations || typeof translations !== "object") return fallback;
  const loc = locale.trim().toLowerCase();
  const orderedCountries = [
    CMS_DEFAULT_COUNTRY_KEY,
    ...Object.keys(translations)
      .filter((k) => k !== CMS_DEFAULT_COUNTRY_KEY)
      .sort((a, b) => a.localeCompare(b)),
  ];
  for (const cc of orderedCountries) {
    const n = (translations[cc]?.[loc]?.name ?? "").trim();
    if (n) return n;
  }
  for (const cc of orderedCountries) {
    const map = translations[cc];
    if (!map || typeof map !== "object") continue;
    for (const b of Object.values(map)) {
      const n = (b?.name ?? "").trim();
      if (n) return n;
    }
  }
  return fallback;
}

/** Libellé d’une langue (document `languages`) pour l’UI admin : priorité `__` + locale d’édition. */
export function labelForRegionalLanguage(
  translations: RegionalTranslationMap | undefined,
  editorLocale: string,
  codeFallback: string,
): string {
  const n =
    getCmsLocaleBlock(
      translations as CmsTranslationsByCountry,
      CMS_DEFAULT_COUNTRY_KEY,
      editorLocale,
    )?.name?.trim() ?? "";
  if (n) return n;
  return pickSortLabelCms(translations as CmsTranslationsByCountry, editorLocale, codeFallback);
}

/** Types de section gérés par l’admin (clé stockée dans Firestore). */
export type CmsSectionTypeId =
  | "why_choose_us"
  | "site_settings"
  | "blog_section"
  | "profile_listing"
  | "banner"
  | "stat"
  | "features";

export type CmsSectionDoc = {
  id: string;
  sectionKey: string;
  subsectionKey: string;
  /** Référence document `cmsNamespaces` */
  namespaceId?: string;
  sectionType?: CmsSectionTypeId | string;
  active: boolean;
  registrationActive?: boolean;
  /** Médias / liens communs à toutes les langues */
  videoImageUrl?: string;
  /** Image d’en-tête « Profile listing » (hors traductions). */
  profileListingImageUrl?: string;
  videoLink?: string;
  readMoreUrl?: string;
  translations: CmsTranslationsByCountry;
  createdAt?: string;
  updatedAt?: string;
};

export type CmsNamespaceDoc = {
  id: string;
  namespaceKey: string;
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

/** Brouillons édition : pays → locale → texte. */
export type RegionalLocaleDrafts = Record<
  string,
  Record<string, LocaleTextDraft>
>;

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

/**
 * Lit les cellules (pays × langue) pour l’édition (chemins exacts Firestore, sans héritage).
 */
export function mergeRegionalDraftsFromTranslations(
  translations: RegionalTranslationMap | undefined,
  sortedCountryCodes: string[],
  sortedLocaleCodes: string[],
): RegionalLocaleDrafts {
  const out: RegionalLocaleDrafts = {};
  for (const c of sortedCountryCodes) {
    out[c] = {};
    for (const loc of sortedLocaleCodes) {
      const b = translations?.[c]?.[loc];
      out[c][loc] = {
        name: (b?.name ?? "").trim(),
        description: typeof b?.description === "string" ? b.description : "",
      };
    }
  }
  return out;
}

export function hasAnyRegionalDraftName(drafts: RegionalLocaleDrafts): boolean {
  for (const byLoc of Object.values(drafts)) {
    for (const d of Object.values(byLoc)) {
      if (d.name.trim()) return true;
    }
  }
  return false;
}

/** Nombre de langues distinctes ayant au moins un nom pour un pays quelconque. */
export function localeFilledCountRegional(
  translations: RegionalTranslationMap | undefined,
): number {
  if (!translations) return 0;
  const langs = new Set<string>();
  for (const map of Object.values(translations)) {
    if (!map) continue;
    for (const [loc, b] of Object.entries(map)) {
      if (b?.name?.trim()) langs.add(loc);
    }
  }
  return langs.size;
}

export function pickRegionalSortLabel(
  translations: RegionalTranslationMap | undefined,
  locale: string,
  fallback: string,
): string {
  return pickSortLabelCms(translations as CmsTranslationsByCountry, locale, fallback);
}

export function sortedActiveLanguageCodes(langs: LanguageDocLike[]): string[] {
  return [...langs]
    .map((l) => l.code.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

/** Déduit le type de section si le document date d’avant `sectionType`. */
export function inferCmsSectionType(doc: CmsSectionDoc): CmsSectionTypeId {
  const raw = doc.sectionType?.trim();
  if (raw === "stats") return "stat";
  if (
    raw === "why_choose_us" ||
    raw === "site_settings" ||
    raw === "blog_section" ||
    raw === "profile_listing" ||
    raw === "banner" ||
    raw === "stat" ||
    raw === "features"
  ) {
    return raw;
  }
  const sub = doc.subsectionKey?.trim().toLowerCase() ?? "";
  if (sub === "blog-section") return "blog_section";
  if (sub === "profile-listing" || sub.startsWith("profile-listing"))
    return "profile_listing";
  if (sub === "user-interface-settings") return "site_settings";
  if (sub.startsWith("why-choose")) return "why_choose_us";
  if (sub === "banner" || sub.startsWith("banner-")) return "banner";
  if (sub === "stats" || sub.startsWith("stats-")) return "stat";
  if (sub === "stat" || sub.startsWith("stat-")) return "stat";
  if (sub === "features" || sub.startsWith("features-")) return "features";
  return "site_settings";
}
