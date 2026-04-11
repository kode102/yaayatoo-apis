import type {Request, Response} from "express";
import {db} from "../lib/admin.js";
import {isPublicActiveDoc} from "../lib/public-active-doc.js";
import {
  CMS_DEFAULT_COUNTRY,
  normCmsCountryCode,
  resolveCmsBlock,
  toNestedCmsTranslations,
} from "../admin/cms-translations.js";
import {DEFAULT_LOCALE, normLocale} from "../admin/i18n.js";

type NewsFeedRow = {
  id: string;
  redirectUrl: string;
  titleHtml: string;
};

/**
 * Convertit timestamp Firestore / ISO en epoch millisecondes.
 * @param {unknown} v Valeur brute.
 * @return {number} Epoch (ms) ou 0 si invalide.
 */
function timestampToMillis(v: unknown): number {
  if (
    v &&
    typeof v === "object" &&
    typeof (v as {toDate?: () => Date}).toDate === "function"
  ) {
    return (v as {toDate: () => Date}).toDate().getTime();
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

/**
 * GET /public/news-feed
 * Retourne les entrées actives `newsFeed` avec titre HTML résolu.
 * @param {Request} req Requête Express.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicNewsFeed(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const locale = normLocale(
      String(req.query.locale ?? req.query.sortLocale ?? DEFAULT_LOCALE),
    );
    const countryCode = normCmsCountryCode(
      String(req.query.country ?? req.query.countryCode ?? ""),
    );
    const rawLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(rawLimit) ?
      Math.max(1, Math.min(50, Math.trunc(rawLimit))) :
      20;

    const snap = await db.collection("newsFeed").get();
    const rows: Array<NewsFeedRow & {sortTs: number}> = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      if (!isPublicActiveDoc(data)) continue;
      const nested = toNestedCmsTranslations(data.translations);
      const block =
        resolveCmsBlock(nested, countryCode, locale) ??
        resolveCmsBlock(nested, CMS_DEFAULT_COUNTRY, locale);
      const titleHtml = String(block?.labelHtml ?? block?.name ?? "").trim();
      if (!titleHtml) continue;
      rows.push({
        id: doc.id,
        redirectUrl: String(data.redirectUrl ?? "").trim(),
        titleHtml,
        sortTs: Math.max(
          timestampToMillis(data.updatedAt),
          timestampToMillis(data.createdAt),
        ),
      });
    }

    rows.sort((a, b) => b.sortTs - a.sortTs);
    res.status(200).json({
      success: true,
      data: rows.slice(0, limit).map((row) => ({
        id: row.id,
        redirectUrl: row.redirectUrl,
        titleHtml: row.titleHtml,
      })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
