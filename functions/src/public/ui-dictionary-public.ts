/**
 * Dictionnaire interface (Firestore `adminUiDictionary`) — lecture publique pour la vitrine.
 */

import type {Request, Response} from "express";
import {db} from "../lib/admin.js";
import {readUiDictionaryTranslations} from "../lib/ui-dictionary-shared.js";

/**
 * GET /public/ui-dictionary — toutes les clés, par locale (sans auth).
 * @param {Request} _req Requête.
 * @param {Response} res Réponse JSON `{ success, data: { [key]: { [locale]: string } } }`.
 * @return {Promise<void>}
 */
export async function getPublicUiDictionary(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const snap = await db.collection("adminUiDictionary").get();
    const data: Record<string, Record<string, string>> = {};
    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;
      data[d.id] = readUiDictionaryTranslations(raw);
    }
    res.status(200).json({success: true, data});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
