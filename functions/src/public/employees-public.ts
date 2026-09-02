/**
 * Profils employés pour la vitrine (liste d’accueil) — sans authentification.
 */

import type {Request, Response} from "express";
import type {
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {Timestamp} from "firebase-admin/firestore";
import {
  CMS_DEFAULT_COUNTRY,
  normCmsCountryCode,
  resolveCmsBlock,
} from "../admin/cms-translations.js";
import {serviceDocToNested} from "../admin/reference-nested.js";
import {DEFAULT_LOCALE, normLocale} from "../admin/i18n.js";
import {db} from "../lib/admin.js";
import {isPublicActiveDoc} from "../lib/public-active-doc.js";
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
  return snap.docs
    .filter((d) => isPublicActiveDoc(d.data()))
    .map((d) => d.id);
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
 * Id Firestore document sûr (pas de `/` — sinon `.doc()` plante).
 * Certains employés stockent un libellé (`Vendeuse/Commercial`)
 * au lieu d’un id.
 * @param {string} id Candidat.
 * @return {boolean} Utilisable comme doc id.
 */
function isSafeFirestoreDocId(id: string): boolean {
  const t = String(id ?? "").trim();
  return Boolean(t) && !t.includes("/");
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
      if (!isPublicActiveDoc(data)) continue;
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
        if (!isSafeFirestoreDocId(sid)) {
          // Libellé legacy stocké à la place d’un id service.
          serviceNames.set(sid, sid);
          return;
        }
        const s = await db.collection("services").doc(sid).get();
        if (!s.exists) return;
        if (!isPublicActiveDoc(s.data())) return;
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
      const dobYmd = dateFieldToYmd(emp.dateOfBirth ?? emp.birthDate);
      const startYmd = dateFieldToYmd(emp.startedWorkingAt);
      // Repli sur le champ numérique `age` (fiches sans date de naissance).
      const ageField =
        typeof emp.age === "number" && Number.isFinite(emp.age) && emp.age > 0 ?
          Math.round(emp.age) :
          null;
      const ageYears = fullYearsSinceYmd(dobYmd) ?? ageField;
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

      const workRaw = String(emp.workType ?? "FULL_TIME").trim().toUpperCase();
      const workType = workRaw === "PART_TIME" ? "PART_TIME" : "FULL_TIME";

      // Adresse publique : `address`, sinon quartier + ville (legacy).
      const address = String(emp.address ?? "").trim();
      const quartier = String(emp.quartier ?? "").trim();
      const ville = String(emp.ville ?? emp.city ?? "").trim();
      const homeAddress =
        address ||
        [quartier, ville].filter(Boolean).join(", ") ||
        ville;

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
        homeAddress,
        // Champs séparés pour l'affichage « Ville · Quartier » côté site.
        ville,
        quartier,
        workType,
      };
    });

    res.status(200).json({success: true, data});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}

const DETAIL_PAGE = 500;
const SIMILAR_MAX = 6;
const REVIEWS_MAX = 8;

/**
 * Résout un employé actif par id document ou slug public.
 * Parcourt toute la collection (pagination) — un `limit` fixe
 * manquait des profils au-delà des N premiers docs.
 * @param {string} param Segment d’URL.
 * @return {Promise<Object|null>} id + data, ou null.
 */
async function findActiveEmployeeByParam(
  param: string,
): Promise<{id: string; data: DocumentData} | null> {
  const p = String(param ?? "").trim();
  if (!p) return null;

  const byId = await db.collection("employee").doc(p).get();
  if (byId.exists) {
    const data = byId.data() as DocumentData;
    if (isPublicActiveDoc(data) && isEmployableStatus(data)) {
      return {id: byId.id, data};
    }
  }

  let lastDoc: QueryDocumentSnapshot | null = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = db.collection("employee").orderBy("__name__").limit(DETAIL_PAGE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const d of snap.docs) {
      const data = d.data();
      if (!isPublicActiveDoc(data)) continue;
      if (!isEmployableStatus(data)) continue;
      const fullName = String(data.fullName ?? "").trim() || d.id;
      if (publicEmployeeSlug(d.id, fullName) === p) {
        return {id: d.id, data};
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1]!;
    if (snap.size < DETAIL_PAGE) break;
  }
  return null;
}

/**
 * @param {unknown} v Valeur numérique brute.
 * @return {number|null} Nombre fini ou null.
 */
function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * @param {DocumentData} emp Document employé.
 * @return {string[]} Langues.
 */
function readLanguages(emp: DocumentData): string[] {
  const raw = emp.langues ?? emp.languages;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/**
 * @param {DocumentData} emp Document employé.
 * @param {Map<string, string>} serviceNames Noms résolus.
 * @return {string[]} Libellés services.
 */
function readServiceLabels(
  emp: DocumentData,
  serviceNames: Map<string, string>,
): string[] {
  const offered = Array.isArray(emp.offeredServiceIds) ?
    emp.offeredServiceIds :
    [];
  const fromIds = offered
    .map((raw) => {
      const id = String(raw ?? "").trim();
      if (!id) return "";
      return serviceNames.get(id) ?? (isSafeFirestoreDocId(id) ? "" : id);
    })
    .filter(Boolean);
  if (fromIds.length > 0) return fromIds;
  if (Array.isArray(emp.services)) {
    return emp.services.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  const single = String(emp.service ?? "").trim();
  return single ? [single] : [];
}

/**
 * Avis clients publics liés aux offres de l’employé.
 * @param {string} employeeId Id employé.
 * @return {Promise<Object[]>} Cartes avis.
 */
async function publicReviewsForEmployee(employeeId: string): Promise<{
  id: string;
  clientName: string;
  clientImageUrl: string | null;
  rating: number;
  comment: string;
  reviewedAt: string;
  city: string | null;
}[]> {
  const offerIds = await jobOfferIdsForEmployee(employeeId);
  if (offerIds.length === 0) return [];

  type Row = {
    id: string;
    clientName: string;
    clientImageUrl: string | null;
    rating: number;
    comment: string;
    reviewedAt: string;
    city: string | null;
    sortMs: number;
  };
  const rows: Row[] = [];

  for (let i = 0; i < offerIds.length; i += 10) {
    const chunk = offerIds.slice(i, i + 10);
    const snap = await db
      .collection("jobReviews")
      .where("jobOfferId", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const d = doc.data();
      if (!isPublicActiveDoc(d) && d.active === false) continue;
      const rating = numRating(d.rating);
      if (rating === null) continue;
      const comment = String(
        d.reviewText ?? d.comment ?? d.text ?? "",
      ).trim();
      if (!comment) continue;
      let sortMs = 0;
      let reviewedAt = "";
      const rawAt = d.reviewedAt ?? d.createdAt;
      if (
        rawAt &&
        typeof rawAt === "object" &&
        typeof (rawAt as {toDate?: () => Date}).toDate === "function"
      ) {
        const dt = (rawAt as {toDate: () => Date}).toDate();
        sortMs = dt.getTime();
        reviewedAt = dt.toISOString().slice(0, 10);
      } else if (typeof rawAt === "string" && rawAt.trim()) {
        const dt = new Date(rawAt);
        if (!Number.isNaN(dt.getTime())) {
          sortMs = dt.getTime();
          reviewedAt = dt.toISOString().slice(0, 10);
        }
      }
      rows.push({
        id: doc.id,
        clientName: String(d.reviewerName ?? d.clientName ?? "").trim() ||
          "Client",
        clientImageUrl:
          String(d.reviewerImageUrl ?? d.clientImageUrl ?? "").trim() || null,
        rating,
        comment,
        reviewedAt,
        city: String(d.city ?? d.ville ?? "").trim() || null,
        sortMs,
      });
    }
  }

  rows.sort((a, b) => b.sortMs - a.sortMs);
  return rows.slice(0, REVIEWS_MAX).map((row) => {
    const {sortMs: _ignored, ...rest} = row;
    void _ignored;
    return rest;
  });
}

/**
 * GET /public/employees/:employeeKey — fiche publique (id ou slug).
 * Query : `locale`, `country` (ISO2).
 * @param {express.Request} req Requête.
 * @param {express.Response} res Réponse.
 * @return {Promise<void>}
 */
export async function getPublicEmployeeDetail(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const employeeKey = String(req.params.employeeKey ?? "").trim();
    if (!employeeKey) {
      res.status(400).json({success: false, error: "employeeKey requis"});
      return;
    }

    const locale = normLocale(String(req.query.locale ?? DEFAULT_LOCALE));
    const countryCode = normCmsCountryCode(String(req.query.country ?? ""));

    const found = await findActiveEmployeeByParam(employeeKey);
    if (!found) {
      res.status(404).json({success: false, error: "Profil introuvable"});
      return;
    }
    if (!matchesCountryFilter(found.data, countryCode)) {
      res.status(404).json({success: false, error: "Profil introuvable"});
      return;
    }

    const emp = found.data;
    const id = found.id;
    const fullName = String(emp.fullName ?? "").trim() || id;
    const slug = publicEmployeeSlug(id, fullName);

    const offered = Array.isArray(emp.offeredServiceIds) ?
      emp.offeredServiceIds.map((x) => String(x ?? "").trim()).filter(Boolean) :
      [];
    const serviceIds = new Set<string>(offered);

    const poolSnap = await db.collection("employee").limit(DETAIL_PAGE).get();
    const similarCandidates: {id: string; data: DocumentData}[] = [];
    for (const d of poolSnap.docs) {
      if (d.id === id) continue;
      const data = d.data();
      if (!isPublicActiveDoc(data)) continue;
      if (!isEmployableStatus(data)) continue;
      if (!matchesCountryFilter(data, countryCode)) continue;
      const otherOffered = Array.isArray(data.offeredServiceIds) ?
        data.offeredServiceIds.map((x) => String(x ?? "").trim()) :
        [];
      const shareService = otherOffered.some((sid) => serviceIds.has(sid));
      const sameCity =
        String(data.ville ?? data.city ?? "").trim().toLowerCase() ===
        String(emp.ville ?? emp.city ?? "").trim().toLowerCase() &&
        Boolean(String(emp.ville ?? emp.city ?? "").trim());
      if (shareService || sameCity) {
        similarCandidates.push({id: d.id, data});
        for (const sid of otherOffered) {
          if (sid) serviceIds.add(sid);
        }
      }
    }

    const serviceNames = new Map<string, string>();
    await Promise.all(
      [...serviceIds].map(async (sid) => {
        if (!isSafeFirestoreDocId(sid)) {
          serviceNames.set(sid, sid);
          return;
        }
        const s = await db.collection("services").doc(sid).get();
        if (!s.exists) return;
        if (!isPublicActiveDoc(s.data())) return;
        const name = servicePrimaryName(s.data()!, countryCode, locale);
        if (name) serviceNames.set(sid, name);
      }),
    );

    const [stats, reviews] = await Promise.all([
      reviewStatsForEmployeeAssignedOffers(id),
      publicReviewsForEmployee(id),
    ]);

    const badgeRaw = String(emp.badge ?? "NONE").trim().toUpperCase() || "NONE";
    const badge =
      badgeRaw === "BLUE" || badgeRaw === "GREEN" || badgeRaw === "YELLOW" ?
        badgeRaw :
        "NONE";
    const verified = badge !== "NONE";

    const dobYmd = dateFieldToYmd(emp.dateOfBirth ?? emp.birthDate);
    const age =
      fullYearsSinceYmd(dobYmd) ??
      (typeof emp.age === "number" && Number.isFinite(emp.age) ?
        emp.age :
        null);
    const startYmd = dateFieldToYmd(emp.startedWorkingAt);
    const experienceYears = fullYearsSinceYmd(startYmd);
    const experience =
      experienceYears != null ?
        String(experienceYears) :
        (emp.experience != null || emp.yearsOfExperience != null ?
          String(emp.experience ?? emp.yearsOfExperience) :
          null);

    const workRaw = String(
      emp.workType ?? emp.disponibilite ?? "FULL_TIME",
    ).trim().toUpperCase();
    let availability: "FULL_TIME" | "PART_TIME" | "AVAILABLE" | "UNAVAILABLE" =
      "AVAILABLE";
    if (workRaw === "PART_TIME") availability = "PART_TIME";
    else if (workRaw === "FULL_TIME") availability = "FULL_TIME";
    else if (workRaw === "UNAVAILABLE" || workRaw === "FALSE") {
      availability = "UNAVAILABLE";
    } else if (typeof emp.disponibilite === "boolean") {
      availability = emp.disponibilite ? "AVAILABLE" : "UNAVAILABLE";
    }

    const availableForContract =
      availability !== "UNAVAILABLE" && emp.availableForContract !== false;

    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = String(emp.firstName ?? nameParts[0] ?? "").trim();
    const lastFromParts =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    const lastName = String(
      emp.lastName ?? lastFromParts,
    ).trim();

    const city = String(emp.ville ?? emp.city ?? "").trim();
    const neighborhood = String(emp.quartier ?? "").trim() || null;
    const services = readServiceLabels(emp, serviceNames);
    const salaryMin =
      numOrNull(emp.salaire_min ?? emp.minimumSalary ?? emp.salaryMin);
    const salaryMax =
      numOrNull(emp.salaire_max ?? emp.maximumSalary ?? emp.salaryMax);

    const evaluationsRaw =
      Array.isArray(emp.evaluations) ? emp.evaluations : [];
    const evaluations = evaluationsRaw
      .slice(0, 4)
      .map((row: unknown, idx: number) => {
        if (!row || typeof row !== "object") return null;
        const o = row as Record<string, unknown>;
        const reviewer =
          o.reviewer && typeof o.reviewer === "object" ?
            (o.reviewer as Record<string, unknown>) :
            {};
        return {
          id: String(o.id ?? `eval-${idx}`),
          label: String(o.label ?? o.title ?? "").trim(),
          score: numOrNull(o.score ?? o.rating),
          reviewer: {
            name: String(reviewer.name ?? "").trim(),
            role: String(reviewer.role ?? "").trim(),
            imageUrl: String(reviewer.imageUrl ?? "").trim() || null,
          },
          comment: String(o.comment ?? "").trim() || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> =>
        Boolean(row && (row.label || row.comment)),
      );

    const similarWithStats = await Promise.all(
      shuffle(similarCandidates)
        .slice(0, SIMILAR_MAX * 2)
        .map(async ({id: sid, data}) => {
          const sStats = await reviewStatsForEmployeeAssignedOffers(sid);
          const sName = String(data.fullName ?? "").trim() || sid;
          const sSlug = publicEmployeeSlug(sid, sName);
          const sOffered = Array.isArray(data.offeredServiceIds) ?
            data.offeredServiceIds :
            [];
          const sServices = sOffered
            .map((x) => serviceNames.get(String(x ?? "").trim()) ?? "")
            .filter(Boolean);
          const sExpY = fullYearsSinceYmd(
            dateFieldToYmd(data.startedWorkingAt),
          );
          const sWork = String(data.workType ?? "FULL_TIME")
            .trim()
            .toUpperCase();
          return {
            id: sid,
            slug: sSlug,
            fullName: sName,
            profileImageUrl:
              String(data.profileImageUrl ?? data.photo ?? "").trim() || null,
            services: sServices.length > 0 ? sServices :
              (Array.isArray(data.services) ?
                data.services.map((x: unknown) => String(x)).filter(Boolean) :
                []),
            experience: sExpY != null ? String(sExpY) : null,
            city: String(data.ville ?? data.city ?? "").trim(),
            rating: sStats.averageRating,
            totalReviews: sStats.totalReviews,
            availability: sWork === "PART_TIME" ? "PART_TIME" : "FULL_TIME",
          };
        }),
    );

    const payload = {
      id,
      slug,
      fullName,
      firstName,
      lastName,
      age,
      gender: String(emp.genre ?? emp.gender ?? "").trim() || null,
      origin: String(emp.origine ?? emp.origin ?? "").trim() || null,
      languages: readLanguages(emp),
      religion: String(emp.religion ?? "").trim() || null,
      education:
        String(emp.niveau_etude ?? emp.educationLevel ?? emp.education ?? "")
          .trim() || null,
      professionalTraining:
        String(emp.formation_pro ?? emp.professionalTraining ?? "").trim() ||
        null,
      children: numOrNull(emp.enfants ?? emp.children),
      maritalStatus:
        String(emp.situation_matrimoniale ?? emp.maritalStatus ?? "").trim() ||
        null,
      city,
      neighborhood,
      services,
      isResident: Boolean(emp.residente ?? emp.isResident ?? false),
      experience,
      availableForContract,
      availability,
      bio:
        String(emp.bio ?? emp.description ?? emp.notes ?? "").trim() || null,
      profileImageUrl:
        String(emp.profileImageUrl ?? emp.photo ?? emp.photoUrl ?? "").trim() ||
        null,
      verified,
      badge,
      salaryMin,
      salaryMax,
      rating: stats.averageRating,
      totalReviews: stats.totalReviews,
      evaluations,
      reviews,
      similarProfiles: similarWithStats.slice(0, SIMILAR_MAX),
    };

    res.status(200).json({success: true, data: payload});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
