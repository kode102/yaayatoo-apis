/**
 * Sujets du formulaire contact (vitrine) — sans authentification.
 */

import type {Request, Response} from "express";
import {db} from "../lib/admin.js";
import {DEFAULT_LOCALE, normLocale} from "../admin/i18n.js";

export type PublicContactSubjectRow = {
  valueKey: string;
  label: string;
};

type RowInternal = PublicContactSubjectRow & {sortOrder: number};

/**
 * Libellé selon la locale demandée (fr / en par défaut).
 * @param {Record<string, unknown>} data Données Firestore.
 * @param {string} locale Locale normalisée.
 * @return {string} Texte affichable.
 */
function pickLabel(data: Record<string, unknown>, locale: string): string {
  const fr = String(data.labelFr ?? "").trim();
  const en = String(data.labelEn ?? "").trim();
  const loc = locale.toLowerCase();
  if (loc.startsWith("fr") && fr) return fr;
  if (loc.startsWith("en") && en) return en;
  if (fr) return fr;
  if (en) return en;
  return String(data.valueKey ?? "").trim() || "—";
}

/**
 * GET /public/contact-subjects (?locale=)
 * @param {Request} req Requête.
 * @param {Response} res Réponse.
 * @return {Promise<void>}
 */
export async function getPublicContactSubjects(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const qLoc = req.query.locale ?? req.query.sortLocale;
    const locRaw = Array.isArray(qLoc) ? qLoc[0] : qLoc;
    const locale =
      normLocale(String(locRaw ?? "")) || DEFAULT_LOCALE;
    const snap = await db.collection("contactSubjects").get();
    const rows: RowInternal[] = [];
    for (const d of snap.docs) {
      const x = d.data() as Record<string, unknown>;
      if (x.active === false) continue;
      const valueKey = String(x.valueKey ?? "").trim().toLowerCase();
      if (!valueKey) continue;
      const so = Number(x.sortOrder);
      const sortOrder =
        Number.isFinite(so) ? Math.floor(so) : 0;
      rows.push({
        valueKey,
        label: pickLabel(x, locale),
        sortOrder,
      });
    }
    rows.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.valueKey.localeCompare(b.valueKey, "fr");
    });
    const out: PublicContactSubjectRow[] = rows.map(({valueKey, label}) => ({
      valueKey,
      label,
    }));
    res.status(200).json({success: true, data: out});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
