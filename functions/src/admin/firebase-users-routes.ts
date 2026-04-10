/**
 * Comptes Firebase Auth : liste, CRUD, SMS OTP (Identity Toolkit).
 */

import type {Request, Response, Router} from "express";
import type {UserRecord} from "firebase-admin/auth";
import {admin} from "../lib/admin.js";

function serializeAuthUser(u: UserRecord): Record<string, unknown> {
  return {
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    phoneNumber: u.phoneNumber ?? null,
    disabled: u.disabled,
    emailVerified: u.emailVerified,
    creationTime: u.metadata.creationTime,
    lastSignInTime: u.metadata.lastSignInTime ?? null,
    providerData: u.providerData.map((p) => ({
      providerId: p.providerId,
      uid: p.uid,
      displayName: p.displayName ?? null,
      email: p.email ?? null,
      phoneNumber: p.phoneNumber ?? null,
    })),
  };
}

/**
 * Routes montées sur le routeur admin après requireAuth.
 * @param {express.Router} router Routeur Express admin.
 */
export function attachFirebaseUserRoutes(router: Router): void {
  router.get("/firebase-users", async (req: Request, res: Response) => {
    const maxRaw = Number(req.query.maxResults);
    let maxResults = 50;
    if (Number.isFinite(maxRaw)) {
      maxResults = Math.min(100, Math.max(1, Math.floor(maxRaw)));
    }
    let pageToken: string | undefined;
    const pt = req.query.pageToken;
    if (typeof pt === "string" && pt.trim()) {
      pageToken = pt.trim();
    }
    try {
      const list = await admin.auth().listUsers(maxResults, pageToken);
      res.status(200).json({
        success: true,
        data: list.users.map(serializeAuthUser),
        pageToken: list.pageToken ?? null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  router.get("/firebase-users/:uid", async (req: Request, res: Response) => {
    const uid = req.params.uid?.trim();
    if (!uid) {
      res.status(400).json({success: false, error: "uid invalide"});
      return;
    }
    try {
      const user = await admin.auth().getUser(uid);
      res.status(200).json({
        success: true,
        data: serializeAuthUser(user),
      });
    } catch (e: unknown) {
      const code = (e as {code?: string})?.code;
      if (code === "auth/user-not-found") {
        res.status(404).json({
          success: false,
          error: "Utilisateur introuvable",
        });
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  router.post("/firebase-users", async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const phoneNumber =
      typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const displayNameRaw =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        error: "Numéro de téléphone requis (format E.164, ex. +33612345678)",
      });
      return;
    }
    try {
      const user = await admin.auth().createUser({
        phoneNumber,
        displayName: displayNameRaw || undefined,
        email: emailRaw || undefined,
        disabled: false,
      });
      res.status(201).json({success: true, data: serializeAuthUser(user)});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(400).json({success: false, error: msg});
    }
  });

  router.put("/firebase-users/:uid", async (req: Request, res: Response) => {
    const uid = req.params.uid?.trim();
    if (!uid) {
      res.status(400).json({success: false, error: "uid invalide"});
      return;
    }
    const body = req.body as Record<string, unknown>;
    const updates: {
      phoneNumber?: string;
      displayName?: string;
    } = {};
    if (typeof body.phoneNumber === "string") {
      const p = body.phoneNumber.trim();
      updates.phoneNumber = p || undefined;
    }
    if (typeof body.displayName === "string") {
      updates.displayName = body.displayName.trim() || undefined;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: "Fournir phoneNumber et/ou displayName",
      });
      return;
    }
    try {
      const user = await admin.auth().updateUser(uid, updates);
      res.status(200).json({success: true, data: serializeAuthUser(user)});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(400).json({success: false, error: msg});
    }
  });

  router.post(
    "/firebase-users/:uid/disable",
    async (req: Request, res: Response) => {
      const uid = req.params.uid?.trim();
      if (!uid) {
        res.status(400).json({success: false, error: "uid invalide"});
        return;
      }
      try {
        const user = await admin.auth().updateUser(uid, {disabled: true});
        res.status(200).json({success: true, data: serializeAuthUser(user)});
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(e);
        res.status(400).json({success: false, error: msg});
      }
    },
  );

  router.post(
    "/firebase-users/:uid/enable",
    async (req: Request, res: Response) => {
      const uid = req.params.uid?.trim();
      if (!uid) {
        res.status(400).json({success: false, error: "uid invalide"});
        return;
      }
      try {
        const user = await admin.auth().updateUser(uid, {disabled: false});
        res.status(200).json({success: true, data: serializeAuthUser(user)});
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(e);
        res.status(400).json({success: false, error: msg});
      }
    },
  );

  router.delete("/firebase-users/:uid", async (req: Request, res: Response) => {
    const uid = req.params.uid?.trim();
    if (!uid) {
      res.status(400).json({success: false, error: "uid invalide"});
      return;
    }
    try {
      await admin.auth().deleteUser(uid);
      res.status(200).json({success: true});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(400).json({success: false, error: msg});
    }
  });

  /**
   * Envoie un SMS de vérification (connexion téléphone) via Identity Toolkit.
   * Optionnel : recaptchaToken (reCAPTCHA v3 recommandé côté admin).
   */
  router.post(
    "/firebase-users/:uid/send-verification-sms",
    async (req: Request, res: Response) => {
      const uid = req.params.uid?.trim();
      if (!uid) {
        res.status(400).json({success: false, error: "uid invalide"});
        return;
      }
      const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
      if (!apiKey) {
        res.status(503).json({
          success: false,
          error:
            "Variable FIREBASE_WEB_API_KEY manquante sur les Cloud Functions",
        });
        return;
      }
      let phone: string;
      try {
        const user = await admin.auth().getUser(uid);
        if (!user.phoneNumber) {
          res.status(400).json({
            success: false,
            error: "Aucun numéro de téléphone sur ce compte",
          });
          return;
        }
        phone = user.phoneNumber;
      } catch (e: unknown) {
        const code = (e as {code?: string})?.code;
        if (code === "auth/user-not-found") {
          res.status(404).json({
            success: false,
            error: "Utilisateur introuvable",
          });
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        res.status(500).json({success: false, error: msg});
        return;
      }

      const body = req.body as {recaptchaToken?: string};
      let recaptchaToken = "";
      if (typeof body.recaptchaToken === "string") {
        recaptchaToken = body.recaptchaToken.trim();
      }

      const payload: Record<string, string> = {phoneNumber: phone};
      if (recaptchaToken) {
        payload.recaptchaToken = recaptchaToken;
      }

      try {
        const r = await fetch(
          "https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode" +
            `?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
          },
        );
        const j = (await r.json()) as {
          error?: {message?: string};
        };
        if (!r.ok) {
          res.status(400).json({
            success: false,
            error:
              j.error?.message ??
              `Identity Toolkit HTTP ${r.status}`,
          });
          return;
        }
        res.status(200).json({
          success: true,
          message: "SMS de vérification envoyé (si quotas et reCAPTCHA OK).",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(e);
        res.status(500).json({success: false, error: msg});
      }
    },
  );
}
