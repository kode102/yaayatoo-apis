/**
 * Médias vitrine (`siteMedia`) — lecture publique par tag.
 */

import type {Request, Response} from "express";
import {db} from "../lib/admin.js";
import {isPublicActiveDoc} from "../lib/public-active-doc.js";

/**
 * @param {string} raw Tag d’URL.
 * @return {string} Tag normalisé ou chaîne vide.
 */
function normalizeTagParam(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 48);
}

/**
 * @param {string} raw Clé d’espace optionnelle.
 * @return {string} Chaîne normalisée.
 */
function normalizeNamespaceParam(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

export type PublicSiteMediaRow = {
  id: string;
  url: string;
  altText?: string;
};

/**
 * GET /public/site-media/tag/:tag
 *
 * Query : `limit` (1–50, défaut 5), `namespaceKey` (filtre optionnel, ex.
 * `service`).
 *
 * @param {Request} req Requête Express.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicSiteMediaByTag(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tag = normalizeTagParam(String(req.params.tag ?? ""));
    if (!tag) {
      res.status(400).json({success: false, error: "tag requis"});
      return;
    }
    const limIn = Number(String(req.query.limit ?? "5"));
    const limit = Math.min(
      50,
      Math.max(1, Number.isFinite(limIn) ? Math.floor(limIn) : 5),
    );
    const nsRaw = String(req.query.namespaceKey ?? "").trim();
    const namespaceFilter = nsRaw ? normalizeNamespaceParam(nsRaw) : "";

    const snap = await db
      .collection("siteMedia")
      .where("tags", "array-contains", tag)
      .get();

    const rows: {
      id: string;
      url: string;
      altText: string;
      sortOrder: number;
    }[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      if (!isPublicActiveDoc(data)) continue;
      const url = String(data.url ?? "").trim();
      if (!/^https?:\/\//i.test(url)) continue;
      if (namespaceFilter) {
        const docNs = normalizeNamespaceParam(String(data.namespaceKey ?? ""));
        if (docNs !== namespaceFilter) continue;
      }
      const so = Number(data.sortOrder);
      const sortOrder = Number.isFinite(so) ? Math.floor(so) : 0;
      const altText = String(data.altText ?? "").trim().slice(0, 512);
      rows.push({id: d.id, url, altText, sortOrder});
    }

    rows.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    });

    const data: PublicSiteMediaRow[] = rows.slice(0, limit).map((r) => {
      const out: PublicSiteMediaRow = {id: r.id, url: r.url};
      if (r.altText) out.altText = r.altText;
      return out;
    });

    res.status(200).json({success: true, data});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
