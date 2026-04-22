import type {Request, Response} from "express";
import {db} from "../lib/admin.js";
import {isPublicActiveDoc} from "../lib/public-active-doc.js";
import {
  CMS_DEFAULT_COUNTRY,
  normCmsCountryCode,
  resolveCmsBlock,
  toNestedCmsTranslations,
} from "../admin/cms-translations.js";
import {
  parseAboutPageLocaleBlock,
  pickAboutPageForPublicLocale,
} from "../lib/about-page-template.js";

/**
 * Nettoie une liste de chaînes (trim, dédoublonnage, limites).
 * @param {unknown} raw Valeur brute.
 * @param {number} maxItems Nombre max.
 * @param {number} maxLength Taille max d’un item.
 * @return {string[]} Liste normalisée.
 */
function normalizeList(raw: unknown, maxItems = 30, maxLength = 512): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    out.push(trimmed.slice(0, maxLength));
  }
  return [...new Set(out)].slice(0, maxItems);
}

/**
 * Textes page « À propos » : section CMS `about_page`, sinon legacy
 * `aboutPageByLocale` sur `cmsSettings`.
 * @param {string} requestedCountry Pays résolu (ISO2 / __).
 * @param {string} localeTag `fr` ou `en`.
 * @param {unknown} legacyAbout Racine `aboutPageByLocale` (optionnel).
 * @return {Promise<Record<string, string>>} Champs publics.
 */
async function resolvePublicAboutPage(
  requestedCountry: string,
  localeTag: string,
  legacyAbout: unknown,
): Promise<Record<string, string>> {
  const loc = localeTag === "fr" ? "fr" : "en";
  try {
    const secSnap = await db
      .collection("cmsSections")
      .where("sectionType", "==", "about_page")
      .limit(12)
      .get();
    for (const d of secSnap.docs) {
      const data = d.data();
      if (!isPublicActiveDoc(data)) continue;
      const nested = toNestedCmsTranslations(data.translations);
      const block =
        resolveCmsBlock(nested, requestedCountry, loc) ??
        resolveCmsBlock(nested, CMS_DEFAULT_COUNTRY, loc);
      if (block && typeof block === "object") {
        const parsed = parseAboutPageLocaleBlock(
          block as Record<string, unknown>,
        );
        if (Object.keys(parsed).length > 0) return parsed;
      }
    }
  } catch (e: unknown) {
    console.error(e);
  }
  return pickAboutPageForPublicLocale(legacyAbout, loc);
}

/**
 * GET /public/cms-settings
 * Retourne le premier document actif de la collection cmsSettings.
 * @param {Request} req Requête Express.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicCmsSettings(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const snap = await db.collection("cmsSettings").get();
    const first = snap.docs
      .map(
        (d) =>
          ({
            id: d.id,
            ...(d.data() as Record<string, unknown>),
          }) as {id: string} & Record<string, unknown>,
      )
      .find((row) => isPublicActiveDoc(row));

    if (!first) {
      res.status(200).json({success: true, data: null});
      return;
    }

    const doc = first as Record<string, unknown> & {id: string};
    const requestedCountry = normCmsCountryCode(
      String(req.query.country ?? req.query.countryCode ?? ""),
    );
    const perCountryRaw = doc.perCountry;
    let byCountry: Record<string, Record<string, unknown>> = {};
    if (
      perCountryRaw &&
      typeof perCountryRaw === "object" &&
      !Array.isArray(perCountryRaw)
    ) {
      for (const [k, v] of Object.entries(
        perCountryRaw as Record<string, unknown>,
      )) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          byCountry[normCmsCountryCode(k)] = v as Record<string, unknown>;
        }
      }
    }
    if (Object.keys(byCountry).length === 0) {
      byCountry = {
        [CMS_DEFAULT_COUNTRY]: doc,
      };
    }
    const resolved =
      byCountry[requestedCountry] ??
      byCountry[CMS_DEFAULT_COUNTRY] ??
      Object.values(byCountry)[0] ??
      {};

    const contentLocale = String(req.query.locale ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 2);
    const aboutPage = await resolvePublicAboutPage(
      requestedCountry,
      contentLocale === "fr" ? "fr" : "en",
      doc.aboutPageByLocale,
    );

    res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        countryCode: requestedCountry,
        googlePlayStoreLink: String(resolved.googlePlayStoreLink ?? "").trim(),
        appleAppStoreLink: String(resolved.appleAppStoreLink ?? "").trim(),
        facebookLink: String(resolved.facebookLink ?? "").trim(),
        twitterXLink: String(resolved.twitterXLink ?? "").trim(),
        instagramLink: String(resolved.instagramLink ?? "").trim(),
        linkedInLink: String(resolved.linkedInLink ?? "").trim(),
        tiktokLink: String(resolved.tiktokLink ?? "").trim(),
        youtubeLink: String(resolved.youtubeLink ?? "").trim(),
        whatsappLink: String(resolved.whatsappLink ?? "").trim(),
        addresses: normalizeList(resolved.addresses, 30, 512),
        phoneNumbers: normalizeList(resolved.phoneNumbers, 30, 64),
        emailAddresses: normalizeList(resolved.emailAddresses, 30, 254),
        aboutPage,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
