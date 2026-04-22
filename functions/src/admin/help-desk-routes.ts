/**
 * Help Desk : envoi de réponses e-mail (SMTP) pour les messages contact.
 */

import type {Request, Response, Router} from "express";
import {FieldValue} from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import type {Transporter} from "nodemailer";
import {db} from "../lib/admin.js";

const MAX_HTML_BYTES = 512 * 1024;
const MAX_SUBJECT_LEN = 200;

type AugmentedRequest = Request & {adminEmail?: string};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let cachedTransport: Transporter | null = null;
let cachedConfigKey = "";

/**
 * Lit la configuration SMTP depuis les variables d’environnement.
 * @return {SmtpConfig|null} Config ou null si incomplète.
 */
function readSmtpConfig(): SmtpConfig | null {
  const host = String(process.env.SMTP_HOST ?? "").trim();
  if (!host) return null;
  const portRaw = String(process.env.SMTP_PORT ?? "587").trim();
  const port = parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  const secure =
    String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true" ||
    port === 465;
  const user = String(process.env.SMTP_USER ?? "").trim();
  const pass = String(process.env.SMTP_PASS ?? "").trim();
  const from = String(process.env.SMTP_FROM ?? user).trim();
  if (!user || !pass || !from) return null;
  return {host, port, secure, user, pass, from};
}

/**
 * Transport nodemailer mis en cache (recréé si la config change).
 * @return {Transporter|null} Transport ou null.
 */
function getTransport(): Transporter | null {
  const cfg = readSmtpConfig();
  if (!cfg) {
    cachedTransport = null;
    cachedConfigKey = "";
    return null;
  }
  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}|${cfg.from}`;
  if (cachedTransport && key === cachedConfigKey) {
    return cachedTransport;
  }
  cachedConfigKey = key;
  cachedTransport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {user: cfg.user, pass: cfg.pass},
  });
  return cachedTransport;
}

/**
 * Texte brut minimal à partir du HTML (corps alternatif).
 * @param {string} html HTML.
 * @return {string} Texte.
 */
function htmlToPlainText(html: string): string {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

/**
 * Indique si le HTML édité est vide (ex. seulement paragraphe vide).
 * @param {string} html HTML.
 * @return {boolean} True si vide.
 */
function isEmptyRichHtml(html: string): boolean {
  return htmlToPlainText(html).length === 0;
}

/**
 * Monte les routes Help Desk sur le routeur admin (déjà protégé par auth).
 * @param {Router} router Routeur Express admin.
 * @return {void}
 */
export function attachHelpDeskRoutes(router: Router): void {
  router.post(
    "/help-desk/contact-messages/:id/send-reply",
    async (req: Request, res: Response) => {
      const id =
        typeof req.params.id === "string" ?
          req.params.id.trim()
        : String(req.params.id ?? "").trim();
      if (!id) {
        res.status(400).json({success: false, error: "Identifiant requis"});
        return;
      }

      const body = req.body as Record<string, unknown>;
      const subject =
        typeof body.subject === "string" ?
          body.subject.trim().slice(0, MAX_SUBJECT_LEN)
        : "";
      const htmlBody =
        typeof body.htmlBody === "string" ? body.htmlBody : "";
      const markHandled =
        typeof body.markHandled === "boolean" ? body.markHandled : true;

      if (!subject) {
        res.status(400).json({success: false, error: "Sujet requis"});
        return;
      }
      if (htmlBody.length > MAX_HTML_BYTES) {
        res.status(400).json({
          success: false,
          error: "Corps du message trop volumineux",
        });
        return;
      }
      if (isEmptyRichHtml(htmlBody)) {
        res.status(400).json({
          success: false,
          error: "Corps du message requis",
        });
        return;
      }

      const ref = db.collection("contactMessages").doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({success: false, error: "Message introuvable"});
        return;
      }
      const data = snap.data()!;
      const to = String(data.email ?? "").trim().toLowerCase();
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        res.status(400).json({
          success: false,
          error: "E-mail destinataire invalide en base",
        });
        return;
      }

      const transport = getTransport();
      if (!transport) {
        res.status(503).json({
          success: false,
          error:
            "SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM)",
        });
        return;
      }

      const cfg = readSmtpConfig()!;
      const adminReq = req as AugmentedRequest;
      const replyTo =
        typeof adminReq.adminEmail === "string" ?
          adminReq.adminEmail.trim()
        : "";

      const text = htmlToPlainText(htmlBody) || "(message vide)";

      try {
        await transport.sendMail({
          from: cfg.from,
          to,
          replyTo: replyTo || undefined,
          subject,
          text,
          html: htmlBody,
          headers: {
            "X-Yaayatoo-Contact-Message-Id": id,
          },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(e);
        res.status(500).json({success: false, error: msg});
        return;
      }

      if (markHandled) {
        try {
          // eslint-disable-next-line new-cap -- FieldValue.serverTimestamp()
          await ref.update({
            handled: true,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } catch (e: unknown) {
          console.error("contactMessages mark handled:", e);
        }
      }

      res.status(200).json({success: true});
    },
  );
}
