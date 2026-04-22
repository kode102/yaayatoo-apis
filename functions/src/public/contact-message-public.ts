/**
 * Soumissions du formulaire « Contact » (vitrine) — sans authentification.
 */

import type {Request, Response} from "express";
import {FieldValue} from "firebase-admin/firestore";
import {db} from "../lib/admin.js";
import {DEFAULT_LOCALE, normLocale} from "../admin/i18n.js";

const ALLOWED_SUBJECTS = new Set(["general", "booking", "support"]);

const MAX_NAME = 200;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 8000;

/**
 * Tronque une chaîne issue du corps JSON.
 * @param {unknown} v Valeur brute.
 * @param {number} max Longueur maximale.
 * @return {string} Chaîne nettoyée (vide si non texte).
 */
function trimStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

/**
 * Vérifie un format d’e-mail minimal (réponse support).
 * @param {string} email E-mail (déjà trim / borné).
 * @return {boolean} True si le motif simple correspond.
 */
function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST JSON : enregistre un message (Firestore collection contactMessages).
 * @param {Request} req Requête Express.
 * @param {Response} res Réponse Express.
 * @return {Promise<void>} Promesse résolue après envoi HTTP.
 */
export async function postPublicContactMessage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({
        success: false,
        error: "Corps JSON invalide (objet attendu)",
      });
      return;
    }

    const name = trimStr(body.name, MAX_NAME);
    const email = trimStr(body.email, MAX_EMAIL).toLowerCase();
    const subject = trimStr(body.subject, 64);
    const message = trimStr(body.message, MAX_MESSAGE);
    const locRaw = trimStr(body.locale, 32);
    const locale = normLocale(locRaw) || DEFAULT_LOCALE;

    if (!name) {
      res.status(400).json({success: false, error: "name requis"});
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({success: false, error: "email invalide"});
      return;
    }
    if (!ALLOWED_SUBJECTS.has(subject)) {
      res.status(400).json({success: false, error: "subject invalide"});
      return;
    }
    if (!message) {
      res.status(400).json({success: false, error: "message requis"});
      return;
    }

    // eslint-disable-next-line new-cap -- FieldValue.serverTimestamp()
    const now = FieldValue.serverTimestamp();
    const ref = db.collection("contactMessages").doc();
    await ref.set({
      name,
      email,
      subject,
      message,
      locale,
      source: "website",
      handled: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      data: {id: ref.id},
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
