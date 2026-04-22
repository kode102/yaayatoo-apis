/**
 * Gabarit « À propos » (`cmsSettings.aboutPageByLocale`).
 * Clés alignées sur le site (snake_case).
 */

/** Locales vitrine gérées dans l’admin pour ce gabarit. */
export const ABOUT_PAGE_SITE_LOCALES = ["en", "fr"] as const;
export type AboutPageSiteLocale = (typeof ABOUT_PAGE_SITE_LOCALES)[number];

/** Champs éditables (identiques aux clés next-intl `Home.about_page.*`). */
export const ABOUT_PAGE_TEMPLATE_FIELDS: {
  key: string;
  maxLen: number;
  url?: boolean;
}[] = [
  {key: "meta_title", maxLen: 120},
  {key: "meta_description", maxLen: 320},
  {key: "title", maxLen: 200},
  {key: "hero_lead", maxLen: 1200},
  {key: "hero_image_url", maxLen: 2048, url: true},
  {key: "hero_image_alt", maxLen: 320},
  {key: "story_heading", maxLen: 200},
  {key: "story_p1", maxLen: 2500},
  {key: "story_p2", maxLen: 2500},
  {key: "story_p3", maxLen: 2500},
  {key: "mission_heading", maxLen: 200},
  {key: "mission_li1_lead", maxLen: 160},
  {key: "mission_li1_text", maxLen: 1200},
  {key: "mission_li2_lead", maxLen: 160},
  {key: "mission_li2_text", maxLen: 1200},
  {key: "mission_li3_lead", maxLen: 160},
  {key: "mission_li3_text", maxLen: 1200},
  {key: "mission_closing", maxLen: 600},
  {key: "values_heading", maxLen: 200},
  {key: "value_trust_title", maxLen: 160},
  {key: "value_trust_body", maxLen: 1600},
  {key: "value_simple_title", maxLen: 160},
  {key: "value_simple_body", maxLen: 1600},
  {key: "value_fair_title", maxLen: 160},
  {key: "value_fair_body", maxLen: 1600},
  {key: "pillars_heading", maxLen: 200},
  {key: "pillar_1_title", maxLen: 160},
  {key: "pillar_1_text", maxLen: 1200},
  {key: "pillar_2_title", maxLen: 160},
  {key: "pillar_2_text", maxLen: 1200},
  {key: "pillar_3_title", maxLen: 160},
  {key: "pillar_3_text", maxLen: 1200},
  {key: "cta_heading", maxLen: 200},
  {key: "cta_body", maxLen: 800},
  {key: "cta_contact", maxLen: 120},
  {key: "cta_services", maxLen: 120},
];

const FIELD_KEYS = new Set(ABOUT_PAGE_TEMPLATE_FIELDS.map((f) => f.key));
const FIELD_META = new Map(
  ABOUT_PAGE_TEMPLATE_FIELDS.map((f) => [f.key, f] as const),
);

/**
 * Tronque et valide une valeur de champ (URL https uniquement si `url`).
 * @param {string} key Clé champ.
 * @param {string} raw Texte brut.
 * @return {string} Chaîne sûre ou vide si invalide.
 */
function sliceField(key: string, raw: string): string {
  const meta = FIELD_META.get(key);
  const max = meta?.maxLen ?? 512;
  const trimmed = raw.trim().slice(0, max);
  if (meta?.url) {
    if (!trimmed) return "";
    if (!/^https:\/\//i.test(trimmed)) return "";
  }
  return trimmed;
}

/**
 * Normalise un bloc langue (objet plat clé → chaîne).
 * @param {unknown} raw Objet ou null.
 * @return {Record<string, string>} Champs non vides uniquement.
 */
export function parseAboutPageLocaleBlock(
  raw: unknown,
): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!FIELD_KEYS.has(k)) continue;
    if (typeof v !== "string") continue;
    const sliced = sliceField(k, v);
    if (sliced) out[k] = sliced;
  }
  return out;
}

/**
 * Normalise `aboutPageByLocale` depuis le corps admin.
 * @param {unknown} raw Carte locale → bloc champs.
 * @return {Record<string, Record<string, string>>} `en` / `fr` uniquement.
 */
export function parseAboutPageByLocaleInput(
  raw: unknown,
): Record<string, Record<string, string>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, Record<string, string>> = {};
  for (const loc of ABOUT_PAGE_SITE_LOCALES) {
    const block = parseAboutPageLocaleBlock(
      (raw as Record<string, unknown>)[loc],
    );
    if (Object.keys(block).length > 0) out[loc] = block;
  }
  return out;
}

/**
 * Bloc public pour une locale (repli sur l’autre langue si vide).
 * @param {unknown} root `aboutPageByLocale` sur le doc Firestore.
 * @param {string} locale `en` ou `fr` (URL site).
 * @return {Record<string, string>} Champs pour l’API publique.
 */
export function pickAboutPageForPublicLocale(
  root: unknown,
  locale: string,
): Record<string, string> {
  const loc = String(locale || "").trim().toLowerCase().slice(0, 2);
  const primary: AboutPageSiteLocale = loc === "fr" ? "fr" : "en";
  if (!root || typeof root !== "object" || Array.isArray(root)) return {};
  const map = root as Record<string, unknown>;
  const fromPrimary = parseAboutPageLocaleBlock(map[primary]);
  if (Object.keys(fromPrimary).length > 0) return fromPrimary;
  const other: AboutPageSiteLocale = primary === "fr" ? "en" : "fr";
  return parseAboutPageLocaleBlock(map[other]);
}
