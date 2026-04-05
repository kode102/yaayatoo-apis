import type {Request, Response, NextFunction} from "express";
import express from "express";
import {FieldValue, type DocumentData} from "firebase-admin/firestore";
import {admin, db} from "../lib/admin.js";
import {
  DEFAULT_LOCALE,
  mergeTranslations,
  normLocale,
  normalizeLegacyCountryTranslations,
  normalizeLegacyLanguageTranslations,
  normalizeLegacyServiceTranslations,
  pickSortLabel,
  type TranslationsMap,
} from "./i18n.js";

const ALLOWED = new Set(["services", "countries", "languages"]);

/**
 * En-têtes CORS pour les routes admin.
 * @param {express.Response} res Réponse HTTP.
 */
function corsAdmin(res: Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
}

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
  let tr: TranslationsMap;
  if (collection === "services") {
    tr = normalizeLegacyServiceTranslations(data);
  } else if (collection === "countries") {
    tr = normalizeLegacyCountryTranslations(data);
  } else {
    tr = normalizeLegacyLanguageTranslations(data);
  }
  base.translations = tr;
  return base;
}

/**
 * Vérifie le jeton Firebase Auth et l’allowlist e-mails optionnelle.
 * @param {express.Request} req Requête.
 * @param {express.Response} res Réponse.
 * @param {express.NextFunction} next Suite middleware.
 * @return {Promise<void>} Résolu après envoi ou next().
 */
async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.headers.authorization;
  if (!raw?.startsWith("Bearer ")) {
    res.status(401).json({success: false, error: "Missing Bearer token"});
    return;
  }
  const token = raw.slice(7).trim();
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded.email) {
      res.status(403).json({
        success: false,
        error: "Compte sans e-mail interdit",
      });
      return;
    }
    const allow =
      process.env.ADMIN_ALLOWED_EMAILS?.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? [];
    if (
      allow.length > 0 &&
      !allow.includes(decoded.email.toLowerCase())
    ) {
      res.status(403).json({
        success: false,
        error: "Accès administrateur refusé",
      });
      return;
    }
    (req as Request & {adminEmail?: string}).adminEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({success: false, error: "Token invalide"});
  }
}

/**
 * Corps POST service : locale + name requis.
 * @param {Record<string, unknown>} body JSON.
 * @return {object|null} Payload ou null.
 */
function parseServicePost(body: Record<string, unknown>): {
  active: boolean;
  locale: string;
  translations: TranslationsMap;
} | null {
  const locale = normLocale(String(body.locale ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!locale || !name) return null;
  const description =
    typeof body.description === "string" ? body.description : "";
  const active =
    typeof body.active === "boolean" ? body.active : true;
  const translations = mergeTranslations({}, locale, {name, description});
  return {active, locale, translations};
}

/**
 * Corps POST pays.
 * @param {Record<string, unknown>} body JSON.
 * @return {object|null} Payload ou null.
 */
function parseCountryPost(body: Record<string, unknown>): {
  code: string;
  flagLink: string;
  active: boolean;
  translations: TranslationsMap;
} | null {
  const locale = normLocale(String(body.locale ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
  const code = codeRaw.toUpperCase();
  if (!locale || !name || !code) return null;
  const flagLink =
    typeof body.flagLink === "string" ? body.flagLink : "";
  const active =
    typeof body.active === "boolean" ? body.active : true;
  const translations = mergeTranslations({}, locale, {name});
  return {code, flagLink, active, translations};
}

/**
 * Corps POST langue (code = identifiant locale, name = libellé dans `locale`).
 * @param {Record<string, unknown>} body JSON.
 * @return {object|null} Payload ou null.
 */
function parseLanguagePost(body: Record<string, unknown>): {
  code: string;
  flagIconUrl: string;
  active: boolean;
  translations: TranslationsMap;
} | null {
  const locale = normLocale(String(body.locale ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code = normLocale(String(body.code ?? ""));
  if (!locale || !name || !code) return null;
  const flagIconUrl =
    typeof body.flagIconUrl === "string" ? body.flagIconUrl : "";
  const active =
    typeof body.active === "boolean" ? body.active : true;
  const translations = mergeTranslations({}, locale, {name});
  return {code, flagIconUrl, active, translations};
}

/**
 * Fusionne un PATCH sur translations + champs scalaires.
 * @param {string} collection Collection.
 * @param {DocumentData} existing Doc existant.
 * @param {Record<string, unknown>} body Corps PUT.
 * @return {Record<string, unknown>|null} Patch Firestore ou null si erreur.
 */
function buildPutPatch(
  collection: string,
  existing: DocumentData,
  body: Record<string, unknown>,
): {patch: Record<string, unknown>; error?: string} | null {
  // eslint-disable-next-line new-cap -- FieldValue.serverTimestamp
  const ts = FieldValue.serverTimestamp();
  const patch: Record<string, unknown> = {updatedAt: ts};

  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }

  const localeRaw = body.locale;
  if (localeRaw !== undefined && localeRaw !== null && localeRaw !== "") {
    const locale = normLocale(String(localeRaw));
    if (!locale) {
      return {patch: {}, error: "locale invalide"};
    }

    let tr: TranslationsMap;
    if (collection === "services") {
      tr = normalizeLegacyServiceTranslations(existing);
    } else if (collection === "countries") {
      tr = normalizeLegacyCountryTranslations(existing);
    } else {
      tr = normalizeLegacyLanguageTranslations(existing);
    }

    if (collection === "services") {
      const name =
        typeof body.name === "string" ? body.name.trim() : undefined;
      const description =
        typeof body.description === "string" ? body.description : undefined;
      if (
        name === undefined &&
        description === undefined
      ) {
        return {patch: {}, error: "name ou description requis avec locale"};
      }
      if (name !== undefined && !name) {
        return {patch: {}, error: "name vide"};
      }
      const block: {name?: string; description?: string} = {};
      if (name !== undefined) block.name = name;
      if (description !== undefined) block.description = description;
      patch.translations = mergeTranslations(tr, locale, block);
    } else if (collection === "countries") {
      const name =
        typeof body.name === "string" ? body.name.trim() : undefined;
      if (name === undefined) {
        return {patch: {}, error: "name requis avec locale"};
      }
      if (!name) {
        return {patch: {}, error: "name vide"};
      }
      patch.translations = mergeTranslations(tr, locale, {name});
    } else {
      const name =
        typeof body.name === "string" ? body.name.trim() : undefined;
      if (name === undefined) {
        return {patch: {}, error: "name requis avec locale"};
      }
      if (!name) {
        return {patch: {}, error: "name vide"};
      }
      patch.translations = mergeTranslations(tr, locale, {name});
    }
  }

  if (collection === "countries") {
    if (typeof body.code === "string") {
      const c = body.code.trim().toUpperCase();
      if (!c) {
        return {patch: {}, error: "code vide"};
      }
      patch.code = c;
    }
    if (typeof body.flagLink === "string") {
      patch.flagLink = body.flagLink;
    }
  }

  if (collection === "languages") {
    if (typeof body.flagIconUrl === "string") {
      patch.flagIconUrl = body.flagIconUrl;
    }
  }

  const keys = Object.keys(patch).filter((k) => k !== "updatedAt");
  if (keys.length === 0) {
    return {patch: {}, error: "Aucun champ à mettre à jour"};
  }

  return {patch};
}

/**
 * Routes CRUD admin (Firestore via Admin SDK). Préfixe monté : /admin
 * @return {express.Router} Routeur Express.
 */
export function createAdminRouter(): express.Router {
  // eslint-disable-next-line new-cap -- express.Router()
  const router = express.Router();
  router.use((req, res, next) => {
    corsAdmin(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    next();
  });
  router.use(requireAuth);

  router.get("/documents/:collection", async (req, res) => {
    const collection = req.params.collection;
    if (!ALLOWED.has(collection)) {
      res.status(400).json({success: false, error: "Collection inconnue"});
      return;
    }
    const sortLocale = normLocale(
      String(req.query.sortLocale ?? DEFAULT_LOCALE),
    );
    try {
      const snap = await db.collection(collection).get();
      const data = snap.docs.map((d) =>
        normalizeOut(collection, d.id, d.data()),
      );
      data.sort((a, b) => {
        const trA = (a.translations ?? {}) as TranslationsMap;
        const trB = (b.translations ?? {}) as TranslationsMap;
        const fa =
          collection === "countries" || collection === "languages" ?
            String(a.code ?? a.id) : String(a.id);
        const fb =
          collection === "countries" || collection === "languages" ?
            String(b.code ?? b.id) : String(b.id);
        return pickSortLabel(trA, sortLocale, fa).localeCompare(
          pickSortLabel(trB, sortLocale, fb),
          "fr",
        );
      });
      res.status(200).json({success: true, data});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  router.post("/documents/:collection", async (req, res) => {
    const collection = req.params.collection;
    if (!ALLOWED.has(collection)) {
      res.status(400).json({success: false, error: "Collection inconnue"});
      return;
    }
    const body = req.body as Record<string, unknown>;
    let payload: Record<string, unknown>;

    if (collection === "services") {
      const v = parseServicePost(body);
      if (!v) {
        res.status(400).json({
          success: false,
          error: "Champs invalides (locale, name requis)",
        });
        return;
      }
      payload = {
        active: v.active,
        translations: v.translations,
      };
    } else if (collection === "countries") {
      const v = parseCountryPost(body);
      if (!v) {
        res.status(400).json({
          success: false,
          error: "Champs invalides (locale, name, code requis)",
        });
        return;
      }
      payload = {
        code: v.code,
        flagLink: v.flagLink,
        active: v.active,
        translations: v.translations,
      };
    } else {
      const v = parseLanguagePost(body);
      if (!v) {
        res.status(400).json({
          success: false,
          error: "Champs invalides (locale, name, code requis)",
        });
        return;
      }
      payload = {
        code: v.code,
        flagIconUrl: v.flagIconUrl,
        active: v.active,
        translations: v.translations,
      };
    }

    // FieldValue est l’API Firebase Admin, pas un constructeur classique.
    // eslint-disable-next-line new-cap -- FieldValue.serverTimestamp
    const now = FieldValue.serverTimestamp();
    try {
      const ref = await db.collection(collection).add({
        ...payload,
        createdAt: now,
        updatedAt: now,
      });
      const created = await ref.get();
      res.status(201).json({
        success: true,
        data: normalizeOut(collection, created.id, created.data()!),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  router.put("/documents/:collection/:id", async (req, res) => {
    const collection = req.params.collection;
    const id = req.params.id;
    if (!ALLOWED.has(collection) || !id) {
      res.status(400).json({success: false, error: "Requête invalide"});
      return;
    }
    const body = req.body as Record<string, unknown>;
    const ref = db.collection(collection).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      res.status(404).json({success: false, error: "Document introuvable"});
      return;
    }

    const built = buildPutPatch(collection, existing.data()!, body);
    if (!built) {
      res.status(400).json({success: false, error: "Requête invalide"});
      return;
    }
    if (built.error) {
      res.status(400).json({success: false, error: built.error});
      return;
    }

    try {
      await ref.update(built.patch);
      const updated = await ref.get();
      res.status(200).json({
        success: true,
        data: normalizeOut(collection, updated.id, updated.data()!),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  router.delete("/documents/:collection/:id", async (req, res) => {
    const collection = req.params.collection;
    const id = req.params.id;
    if (!ALLOWED.has(collection) || !id) {
      res.status(400).json({success: false, error: "Requête invalide"});
      return;
    }
    try {
      await db.collection(collection).doc(id).delete();
      res.status(200).json({success: true});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  return router;
}
