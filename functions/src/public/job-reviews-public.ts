/**
 * Avis (jobReviews) pour la vitrine — sans authentification.
 */

import type {Request, Response} from "express";
import type {DocumentData} from "firebase-admin/firestore";
import {db} from "../lib/admin.js";

/** Réponse JSON pour une carte témoignage. */
export type PublicJobReviewCard = {
  id: string;
  rating: number;
  reviewText: string;
  reviewedAt: string;
  jobTitle: string;
  reviewer: {
    name: string;
    subtitle: string;
    imageUrl: string;
    verified: boolean;
  };
  matchedProfile: {
    name: string;
    subtitle: string;
    imageUrl: string;
    experienceYears: number | null;
    verified: boolean;
  };
};

/**
 * Années entières écoulées depuis une date YYYY-MM-DD.
 * @param {string} ymd Date.
 * @return {number|null} Années ou null.
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
 * Note numérique depuis un document Firestore.
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
 * Chaîne YYYY-MM-DD pour une date d’avis.
 * @param {unknown} v Champ Firestore.
 * @return {string} Date ou chaîne vide.
 */
function reviewedAtString(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * GET /public/job-reviews — avis avec note strictement supérieure à minRating.
 * Query : minRating (défaut 2.5), limit (défaut 30, max 60).
 * @param {express.Request} req Requête.
 * @param {express.Response} res Réponse.
 * @return {Promise<void>} Réponse envoyée.
 */
export async function getPublicJobReviews(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const qMin = req.query.minRating ?? req.query.min;
    const rawMin = Array.isArray(qMin) ? qMin[0] : qMin;
    let parsedMin = 2.5;
    if (typeof rawMin === "string" && rawMin.trim()) {
      parsedMin = parseFloat(rawMin.replace(",", "."));
    }
    const minRating = Number.isFinite(parsedMin) ? parsedMin : 2.5;

    const qLim = req.query.limit;
    const rawLim = Array.isArray(qLim) ? qLim[0] : qLim;
    const parsedLim = parseInt(String(rawLim ?? "30"), 10);
    const limit = Math.min(
      60,
      Math.max(1, Number.isFinite(parsedLim) ? parsedLim : 30),
    );

    const snap = await db
      .collection("jobReviews")
      .where("rating", ">", minRating)
      .limit(Math.min(120, limit * 4))
      .get();

    const cards: PublicJobReviewCard[] = [];

    for (const doc of snap.docs) {
      if (cards.length >= limit) break;
      const r = doc.data() as DocumentData;
      const rating = numRating(r.rating);
      if (rating === null || rating <= minRating) continue;

      const jobOfferId = String(r.jobOfferId ?? "").trim();
      const reviewText = String(r.reviewText ?? "").trim();
      const reviewedAt = reviewedAtString(r.reviewedAt);
      if (!jobOfferId || !reviewText || !reviewedAt) continue;

      const offerSnap = await db.collection("jobOffers").doc(jobOfferId).get();
      if (!offerSnap.exists) continue;
      const offer = offerSnap.data()!;
      const employerId = String(offer.employerId ?? "").trim();
      const employeeId = String(offer.employeeId ?? "").trim();
      const jobTitle = String(offer.jobTitle ?? "").trim();

      let reviewerName = "—";
      let reviewerSubtitle = "";
      let reviewerImage = "";
      let reviewerVerified = false;
      if (employerId) {
        const emSnap = await db.collection("employer").doc(employerId).get();
        if (emSnap.exists) {
          const e = emSnap.data()!;
          const cn = String(e.contactName ?? "").trim();
          const comp = String(e.companyName ?? "").trim();
          const occ = String(e.occupation ?? "").trim();
          // Nom affiché : employeur (companyName), pas l’e-mail (contactName).
          reviewerName = comp || cn || employerId;
          reviewerSubtitle =
            occ || (reviewerName !== comp ? comp : "");
          reviewerImage = String(e.profileImageUrl ?? "").trim();
          reviewerVerified = String(e.badge ?? "") === "TRUSTED";
        }
      }

      let empName = "—";
      let empSubtitle = "";
      let empImage = "";
      let empVerified = false;
      let experienceYears: number | null = null;
      if (employeeId) {
        const wSnap = await db.collection("employee").doc(employeeId).get();
        if (wSnap.exists) {
          const w = wSnap.data()!;
          empName = String(w.fullName ?? "").trim() || employeeId;
          empSubtitle = jobTitle;
          empImage = String(w.profileImageUrl ?? "").trim();
          const b = String(w.badge ?? "NONE");
          empVerified = b !== "NONE";
          const sw = String(w.startedWorkingAt ?? "").trim();
          experienceYears = fullYearsSinceYmd(sw);
        }
      }

      cards.push({
        id: doc.id,
        rating,
        reviewText,
        reviewedAt,
        jobTitle,
        reviewer: {
          name: reviewerName,
          subtitle: reviewerSubtitle,
          imageUrl: reviewerImage,
          verified: reviewerVerified,
        },
        matchedProfile: {
          name: empName,
          subtitle: empSubtitle,
          imageUrl: empImage,
          experienceYears,
          verified: empVerified,
        },
      });
    }

    cards.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));

    res.status(200).json({success: true, data: cards});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
