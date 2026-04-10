/**
 * Profils employés pour la vitrine (liste d’accueil) — sans authentification.
 */

import type {Request, Response} from "express";
import type {DocumentData} from "firebase-admin/firestore";
import {Timestamp} from "firebase-admin/firestore";
import {
  CMS_DEFAULT_COUNTRY,
  normCmsCountryCode,
  resolveCmsBlock,
} from "../admin/cms-translations.js";
import {serviceDocToNested} from "../admin/reference-nested.js";
import {DEFAULT_LOCALE, normLocale} from "../admin/i18n.js";
import {db} from "../lib/admin.js";
import {publicEmployeeSlug} from "./employee-slug.js";

const MAX_FETCH = 150;
const MAX_OUT = 10;

/**
 * @param {unknown} v Champ date employé.
 * @return {string} YYYY-MM-DD ou vide.
 */
function dateFieldToYmd(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  if (v instanceof Timestamp) {
    return v.toDate().toISOString().slice(0, 10);
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return "";
}

/**
 * @param {string} ymd Date YYYY-MM-DD.
 * @return {number|null} Âge ou années d’expérience.
 */
function fullYearsSinceYmd(ymd: string): number | null {
  const t = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const parts = t.split("-").map((x) => parseInt(x, 10));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return null;
  const start = new Date(Date.UTC(y, m - 1, d));
  const now = new Date();
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  const mo = now.getUTCMonth() - start.getUTCMonth();
  const day = now.getUTCDate() - start.getUTCDate();
  if (mo < 0 || (mo === 0 && day < 0)) years--;
  return years >= 0 ? years : 0;
}

/**
 * @template T
 * @param {T[]} arr Tableau.
 * @return {T[]} Copie mélangée (Fisher–Yates).
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j]!;
    a[j] = t!;
  }
  return a;
}

/**
 * @param {DocumentData} emp Document employé.
 * @return {boolean} Badge autre que NONE.
 */
function hasNonNoneBadge(emp: DocumentData): boolean {
  const b = String(emp.badge ?? "NONE").trim().toUpperCase();
  return b !== "NONE";
}

/**
 * Note numérique depuis un document jobReview.
 * @param {unknown} v Valeur brute.
 * @return {number|null} Nombre fini ou null.
 */
function numRating(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Ids des offres où l’employé est assigné.
 * @param {string} employeeId Id document employee.
 * @return {Promise<string[]>} Ids jobOffers.
 */
async function jobOfferIdsForEmployee(employeeId: string): Promise<string[]> {
  const snap = await db
    .collection("jobOffers")
    .where("employeeId", "==", employeeId)
    .get();
  return snap.docs.map((d) => d.id);
}

/**
 * Avis liés aux offres assignées à l’employé : total et moyenne des notes.
 * @param {string} employeeId Id document employee.
 * @return {Promise<Object>} totalReviews, averageRating (ou null).
 */
async function reviewStatsForEmployeeAssignedOffers(
  employeeId: string,
): Promise<{totalReviews: number; averageRating: number | null}> {
  const offerIds = await jobOfferIdsForEmployee(employeeId);
  if (offerIds.length === 0) {
    return {totalReviews: 0, averageRating: null};
  }
  let totalReviews = 0;
  let ratingSum = 0;
  for (let i = 0; i < offerIds.length; i += 10) {
    const chunk = offerIds.slice(i, i + 10);
    const snap = await db
      .collection("jobReviews")
      .where("jobOfferId", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const rating = numRating(doc.data().rating);
      if (rating === null) continue;
      totalReviews++;
      ratingSum += rating;
    }
  }
  const averageRating =
    totalReviews > 0 ?
      Math.round((ratingSum / totalReviews) * 100) / 100 :
      null;
  return {totalReviews, averageRating};
}

/**
 * @param {DocumentData} emp Document employé.
 * @param {string} requestedCc Pays demandé (normalisé).
 * @return {boolean} Inclure ce profil pour ce pays.
 */
function matchesCountryFilter(emp: DocumentData, requestedCc: string): boolean {
  const req = normCmsCountryCode(requestedCc);
  if (!req || req === CMS_DEFAULT_COUNTRY) return true;
  const raw = String(emp.countryCode ?? "").trim().toUpperCase();
  if (!raw || raw === CMS_DEFAULT_COUNTRY) return true;
  return raw === req;
}

/**
 * @param {DocumentData} emp Document employé.
 * @return {boolean} Profil affichable.
 */
function isEmployableStatus(emp: DocumentData): boolean {
  const s = String(emp.status ?? "FREE").trim().toUpperCase();
  return s !== "BLOCKED";
}

/**
 * @param {DocumentData} data Document service.
 * @param {string} countryCode Pays.
 * @param {string} locale Locale.
 * @return {string} Nom affiché.
 */
function servicePrimaryName(
  data: DocumentData,
  countryCode: string,
  locale: string,
): string {
  const nested = serviceDocToNested(data);
  const block =
    resolveCmsBlock(nested, countryCode, locale) ??
    resolveCmsBlock(nested, CMS_DEFAULT_COUNTRY, locale);
  return String(block?.name ?? "").trim();
}

/**
 * GET /public/home-profiles — jusqu’à 10 profils, priorité badge ≠ NONE,
 * tirage aléatoire dans chaque groupe. Chaque entrée inclut le total et la
 * moyenne des avis liés aux offres où l’employé est assigné, et `employeeNote`
 * (champ `notes` Firestore).
 *
 * Query : `locale`, `country` (ISO2), `limit` (max 10, défaut 10).
 * @param {express.Request} req Requête.
 * @param {express.Response} res Réponse.
 * @return {Promise<void>}
 */
export async function getPublicHomeProfiles(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const locale = normLocale(String(req.query.locale ?? DEFAULT_LOCALE));
    const countryCode = normCmsCountryCode(String(req.query.country ?? ""));
    const rawLim = parseInt(String(req.query.limit ?? String(MAX_OUT)), 10);
    const limit = Math.min(
      MAX_OUT,
      Math.max(1, Number.isFinite(rawLim) ? rawLim : MAX_OUT),
    );

    const snap = await db.collection("employee").limit(MAX_FETCH).get();
    const candidates: {id: string; data: DocumentData}[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (!isEmployableStatus(data)) continue;
      if (!matchesCountryFilter(data, countryCode)) continue;
      candidates.push({id: d.id, data});
    }

    const withBadge = candidates.filter((c) => hasNonNoneBadge(c.data));
    const withoutBadge = candidates.filter((c) => !hasNonNoneBadge(c.data));
    const ordered = [...shuffle(withBadge), ...shuffle(withoutBadge)].slice(
      0,
      limit,
    );

    const serviceIds = new Set<string>();
    for (const {data} of ordered) {
      const ids = data.offeredServiceIds;
      if (Array.isArray(ids) && ids.length > 0) {
        const first = String(ids[0] ?? "").trim();
        if (first) serviceIds.add(first);
      }
    }

    const serviceNames = new Map<string, string>();
    await Promise.all(
      [...serviceIds].map(async (sid) => {
        const s = await db.collection("services").doc(sid).get();
        if (!s.exists) return;
        const name = servicePrimaryName(s.data()!, countryCode, locale);
        if (name) serviceNames.set(sid, name);
      }),
    );

    const reviewStats = await Promise.all(
      ordered.map(({id}) => reviewStatsForEmployeeAssignedOffers(id)),
    );

    const data = ordered.map(({id, data: emp}, idx) => {
      const badge = String(emp.badge ?? "NONE").trim().toUpperCase() || "NONE";
      const verified = badge !== "NONE";
      const dobYmd = dateFieldToYmd(emp.dateOfBirth);
      const startYmd = dateFieldToYmd(emp.startedWorkingAt);
      const ageYears = fullYearsSinceYmd(dobYmd);
      const experienceYears = fullYearsSinceYmd(startYmd);

      const offered = Array.isArray(emp.offeredServiceIds) ?
        emp.offeredServiceIds :
        [];
      const firstSid =
        offered.length > 0 ? String(offered[0] ?? "").trim() : "";
      const primaryServiceName =
        firstSid ? (serviceNames.get(firstSid) ?? "") : "";

      const {totalReviews, averageRating} = reviewStats[idx]!;
      const employeeNote = String(emp.notes ?? "").trim();
      const fullName = String(emp.fullName ?? "").trim() || id;
      const employeeSlug = publicEmployeeSlug(id, fullName);

      return {
        id,
        fullName,
        employeeSlug,
        profileImageUrl: String(emp.profileImageUrl ?? "").trim(),
        badge,
        verified,
        ageYears,
        experienceYears,
        primaryServiceName,
        totalReviews,
        averageRating,
        employeeNote,
      };
    });

    res.status(200).json({success: true, data});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
