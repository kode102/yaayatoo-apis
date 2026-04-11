/**
 * Données de référence publiques (pays, langues, services actifs).
 */

import type {Request, Response} from "express";
import type {DocumentData} from "firebase-admin/firestore";
import {db} from "../lib/admin.js";
import {
  CMS_DEFAULT_COUNTRY,
  flattenCmsForSort,
  normCmsCountryCode,
  resolveCmsBlock,
  type CmsNestedTranslations,
} from "../admin/cms-translations.js";
import {
  DEFAULT_LOCALE,
  normLocale,
  normalizeLegacyCountryTranslations,
  pickSortLabel,
  type TranslationsMap,
} from "../admin/i18n.js";
import {
  languageDocToNested,
  serviceDocToNested,
} from "../admin/reference-nested.js";
import {isPublicActiveDoc} from "../lib/public-active-doc.js";
import {publicServiceSlug} from "./service-slug.js";

/**
 * Sérialise un document Firestore pour JSON (timestamps → ISO).
 * @param {string} id Identifiant du document.
 * @param {DocumentData} data Données brutes.
 * @return {Record<string, unknown>} Objet sérialisable.
 */
function serializeDoc(
  id: string,
  data: DocumentData,
): Record<string, unknown> {
  const out: Record<string, unknown> = {id};
  for (const [k, v] of Object.entries(data)) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as {toDate?: () => Date}).toDate === "function"
    ) {
      out[k] = (v as {toDate: () => Date}).toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Normalise la sortie liste selon la collection (traductions + legacy).
 * @param {string} collection Nom Firestore.
 * @param {string} id Id document.
 * @param {DocumentData} data Données.
 * @return {Record<string, unknown>} Payload API.
 */
function normalizeOut(
  collection: string,
  id: string,
  data: DocumentData,
): Record<string, unknown> {
  const base = serializeDoc(id, data);
  if (collection === "services") {
    base.translations = serviceDocToNested(data);
    return base;
  }
  if (collection === "languages") {
    base.translations = languageDocToNested(data);
    return base;
  }
  base.translations = normalizeLegacyCountryTranslations(data);
  return base;
}

/**
 * Document public si `active` n’est pas explicitement `false`.
 * @param {Record<string, unknown>} row Ligne normalisée.
 * @return {boolean} Inclure dans l’API publique.
 */
function isActiveRow(row: Record<string, unknown>): boolean {
  return isPublicActiveDoc(row);
}

/**
 * Code ou id pour le tri (repli pickSortLabel).
 * @param {"countries"|"languages"|"services"} collection Collection.
 * @param {Record<string, unknown>} row Ligne.
 * @return {string} Code pays/langue ou id service.
 */
function sortKey(
  collection: "countries" | "languages" | "services",
  row: Record<string, unknown>,
): string {
  if (collection === "countries" || collection === "languages") {
    return String(row.code ?? row.id);
  }
  return String(row.id);
}

/**
 * Attache `resolvedTranslation` sur une ligne services/langues.
 * @param {"countries"|"languages"|"services"} collection Collection.
 * @param {Record<string, unknown>} row Ligne normalisée.
 * @param {string} countryCode Pays pour la résolution.
 * @param {string} locale Locale pour la résolution.
 * @return {void}
 */
function attachResolvedTranslation(
  collection: "countries" | "languages" | "services",
  row: Record<string, unknown>,
  countryCode: string,
  locale: string,
): void {
  if (collection !== "languages" && collection !== "services") return;
  const nested = row.translations as CmsNestedTranslations;
  const resolved =
    resolveCmsBlock(nested, countryCode, locale) ?? {};
  row.resolvedTranslation = resolved;
}

/**
 * Repli : ancien `labelHtml` à la racine du document service.
 * @param {Record<string, unknown>} row Ligne service normalisée.
 * @return {void}
 */
function mergeLegacyRootLabelHtmlIntoResolved(
  row: Record<string, unknown>,
): void {
  if (String(row.labelHtml ?? "").trim()) {
    const resolved = row.resolvedTranslation;
    if (!resolved || typeof resolved !== "object") return;
    const r = resolved as Record<string, unknown>;
    const fromBlock = r.labelHtml;
    if (typeof fromBlock === "string" && fromBlock.trim()) return;
    const root = row.labelHtml;
    if (typeof root === "string" && root.trim()) {
      row.resolvedTranslation = {...r, labelHtml: root.trim()};
    }
  }
}

/**
 * Note d’avis (nombre fini ou null).
 * @param {unknown} v Valeur Firestore.
 * @return {number|null} Note ou null.
 */
function reviewRatingNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Agrège avis par service via jobOffers.jobOfferId → serviceId.
 * @return {Promise<Map>} Map serviceId → stats.
 */
async function loadReviewStatsByServiceId(): Promise<
  Map<string, {reviewCount: number; averageRating: number}>
  > {
  const [offersSnap, reviewsSnap] = await Promise.all([
    db.collection("jobOffers").select("serviceId", "active").get(),
    db.collection("jobReviews").select("jobOfferId", "rating", "active").get(),
  ]);
  const offerToService = new Map<string, string>();
  for (const d of offersSnap.docs) {
    const od = d.data();
    if (!isPublicActiveDoc(od)) continue;
    const sid = String(od.serviceId ?? "").trim();
    if (sid) offerToService.set(d.id, sid);
  }
  const acc = new Map<string, {count: number; sum: number}>();
  for (const d of reviewsSnap.docs) {
    const rd = d.data();
    if (!isPublicActiveDoc(rd)) continue;
    const oid = String(rd.jobOfferId ?? "").trim();
    const sid = offerToService.get(oid);
    if (!sid) continue;
    const r = reviewRatingNum(rd.rating);
    if (r === null) continue;
    const cur = acc.get(sid) ?? {count: 0, sum: 0};
    cur.count += 1;
    cur.sum += r;
    acc.set(sid, cur);
  }
  const out = new Map<string, {reviewCount: number; averageRating: number}>();
  for (const [sid, {count, sum}] of acc) {
    const averageRating =
      count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    out.set(sid, {reviewCount: count, averageRating});
  }
  return out;
}

/**
 * Liste une collection : actifs uniquement, tri par libellé.
 * @param {"countries"|"languages"|"services"} collection Collection.
 * @param {string} sortLocale Locale pour l’ordre d’affichage.
 * @param {string} countryForResolve Pays pour resolvedTranslation.
 * @return {Promise<Record<string, unknown>[]>} Documents actifs triés.
 */
async function listActiveByCollection(
  collection: "countries" | "languages" | "services",
  sortLocale: string,
  countryForResolve: string,
): Promise<Record<string, unknown>[]> {
  const snap = await db.collection(collection).get();
  const loc = normLocale(sortLocale) || DEFAULT_LOCALE;
  const cc = normCmsCountryCode(countryForResolve);
  const data = snap.docs
    .map((d) => normalizeOut(collection, d.id, d.data()))
    .filter(isActiveRow);
  data.sort((a, b) => {
    let trA: TranslationsMap;
    let trB: TranslationsMap;
    if (collection === "services" || collection === "languages") {
      trA = flattenCmsForSort(
        (a as {translations?: CmsNestedTranslations}).translations ??
          {[CMS_DEFAULT_COUNTRY]: {}},
      );
      trB = flattenCmsForSort(
        (b as {translations?: CmsNestedTranslations}).translations ??
          {[CMS_DEFAULT_COUNTRY]: {}},
      );
    } else {
      trA = (a.translations ?? {}) as TranslationsMap;
      trB = (b.translations ?? {}) as TranslationsMap;
    }
    const fa = sortKey(collection, a);
    const fb = sortKey(collection, b);
    return pickSortLabel(trA, loc, fa).localeCompare(
      pickSortLabel(trB, loc, fb),
      "fr",
    );
  });
  let reviewByService: Map<
    string,
    {reviewCount: number; averageRating: number}
  > | null = null;
  if (collection === "services") {
    reviewByService = await loadReviewStatsByServiceId();
  }
  for (const row of data) {
    attachResolvedTranslation(collection, row, cc, loc);
    if (collection === "services") {
      mergeLegacyRootLabelHtmlIntoResolved(row);
      row.slug = publicServiceSlug(
        String(row.id),
        (row.translations ?? {}) as CmsNestedTranslations,
      );
    }
    if (reviewByService && collection === "services") {
      const stats = reviewByService.get(String(row.id));
      row.reviewCount = stats?.reviewCount ?? 0;
      row.averageRating =
        stats && stats.reviewCount > 0 ? stats.averageRating : null;
    }
  }
  return data;
}

/**
 * Paramètre de tri depuis la query (?locale= ou ?sortLocale=).
 * @param {Request} req Requête Express.
 * @return {string} Locale normalisée (défaut fr).
 */
function readSortLocale(req: Request): string {
  const q = req.query.locale ?? req.query.sortLocale;
  const s = Array.isArray(q) ? q[0] : q;
  return normLocale(String(s ?? "")) || DEFAULT_LOCALE;
}

/**
 * Pays pour résoudre services/langues (?country= ou ?countryCode=, défaut __).
 * @param {Request} req Requête.
 * @return {string} Code pays normalisé.
 */
function readCountryForResolve(req: Request): string {
  const q = req.query.country ?? req.query.countryCode;
  const s = Array.isArray(q) ? q[0] : q;
  return normCmsCountryCode(String(s ?? ""));
}

/**
 * GET /public/countries — pays actifs.
 * @param {Request} req Requête (?locale= pour tri des libellés).
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicCountries(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await listActiveByCollection(
      "countries",
      readSortLocale(req),
      "",
    );
    res.status(200).json({success: true, data});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}

/**
 * GET /public/languages — langues actives (schéma complet Firestore).
 * @param {Request} req Requête.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicLanguages(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await listActiveByCollection(
      "languages",
      readSortLocale(req),
      readCountryForResolve(req),
    );
    res.status(200).json({success: true, data});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}

/**
 * GET /public/services — services actifs.
 * @param {Request} req Requête.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicServices(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await listActiveByCollection(
      "services",
      readSortLocale(req),
      readCountryForResolve(req),
    );
    res.status(200).json({success: true, data});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}

/**
 * GET /public/catalog — pays, langues et services actifs en un appel.
 * @param {Request} req Requête.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const sortLocale = readSortLocale(req);
    const country = readCountryForResolve(req);
    const [countries, languages, services] = await Promise.all([
      listActiveByCollection("countries", sortLocale, ""),
      listActiveByCollection("languages", sortLocale, country),
      listActiveByCollection("services", sortLocale, country),
    ]);
    res.status(200).json({
      success: true,
      data: {countries, languages, services},
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
