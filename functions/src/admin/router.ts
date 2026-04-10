import type {Request, Response, NextFunction} from "express";
import express from "express";
import {FieldValue, type DocumentData} from "firebase-admin/firestore";
import {admin, db} from "../lib/admin.js";
import {
  CMS_DEFAULT_COUNTRY,
  flattenCmsForSort,
  mergeCmsNestedLocaleBlock,
  mergeTranslationBlockNested,
  normCmsCountryCode,
  readNestedCmsFromDoc,
  toNestedCmsTranslations,
  type CmsNestedTranslations,
} from "./cms-translations.js";
import {
  normUiDictLocaleKey,
  readUiDictionaryTranslations,
} from "../lib/ui-dictionary-shared.js";
import {languageDocToNested, serviceDocToNested} from "./reference-nested.js";
import {
  DEFAULT_LOCALE,
  mergeTranslations,
  normLocale,
  normalizeLegacyCountryTranslations,
  normalizeLegacyLanguageTranslations,
  pickSortLabel,
  type TranslationsMap,
} from "./i18n.js";

const ALLOWED = new Set([
  "services",
  "countries",
  "languages",
  "cmsSections",
  "cmsNamespaces",
]);

const CMS_TRANSLATABLE_FIELDS = [
  "name",
  "description",
  "metaKeyword",
  "metaAuthor",
  "metaDescription",
  "facebookLink",
  "twitterLink",
  "linkedinLink",
  "skypeLink",
  "instagramLink",
  "youtubeLink",
  "footerLeftText",
  "section1Title",
  "section1Items",
  "section2Title",
  "section2Items",
  "readMoreLabel",
  "bannerAvatarLinks",
  "bannerAverageRating",
  "bannerTrustCount",
  "bannerTrustLabel",
  "statRows",
  "featureItems",
] as const;

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
  if (collection === "cmsSections") {
    base.translations = toNestedCmsTranslations(data.translations);
    return base;
  }
  if (collection === "services") {
    base.translations = serviceDocToNested(data);
    return base;
  }
  if (collection === "languages") {
    base.translations = languageDocToNested(data);
    return base;
  }
  let tr: TranslationsMap;
  if (collection === "countries") {
    tr = normalizeLegacyCountryTranslations(data);
  } else if (collection === "cmsNamespaces") {
    tr = normalizeLegacyLanguageTranslations(data);
  } else {
    tr = {};
  }
  base.translations = tr;
  return base;
}

/**
 * Identifiant de secours pour trier les listes admin par libellé traduit.
 * @param {string} collection Nom Firestore.
 * @param {Record<string, unknown>} row Document sérialisé.
 * @return {string} Chaîne de secours pour pickSortLabel.
 */
function sortListFallback(
  collection: string,
  row: Record<string, unknown>,
): string {
  if (collection === "countries" || collection === "languages") {
    return String(row.code ?? row.id);
  }
  if (collection === "cmsNamespaces") {
    return String(row.namespaceKey ?? row.id);
  }
  if (collection === "cmsSections") {
    return String(row.subsectionKey ?? row.id);
  }
  return String(row.id);
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
  imageUrl: string;
} | null {
  const locale = normLocale(String(body.locale ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!locale || !name) return null;
  const description =
    typeof body.description === "string" ? body.description : "";
  const imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const active =
    typeof body.active === "boolean" ? body.active : true;
  const country = normCmsCountryCode(
    String(body.countryCode ?? body.country ?? ""),
  );
  const translations = mergeTranslationBlockNested(
    {},
    country,
    locale,
    {name, description},
  );
  return {active, locale, translations, imageUrl};
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
  const country = normCmsCountryCode(
    String(body.countryCode ?? body.country ?? ""),
  );
  const translations = mergeTranslationBlockNested({}, country, locale, {
    name,
  });
  return {code, flagIconUrl, active, translations};
}

/**
 * Corps POST espace CMS (clé technique + libellés traduits).
 * @param {Record<string, unknown>} body JSON.
 * @return {object|null} Payload ou null.
 */
function parseNamespacePost(body: Record<string, unknown>): {
  namespaceKey: string;
  active: boolean;
  translations: TranslationsMap;
} | null {
  const locale = normLocale(String(body.locale ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawKey =
    typeof body.namespaceKey === "string" ? body.namespaceKey.trim() : "";
  const namespaceKey = rawKey.toLowerCase();
  if (!locale || !name || !namespaceKey) return null;
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(namespaceKey)) return null;
  const active = typeof body.active === "boolean" ? body.active : true;
  const translations = mergeTranslations({}, locale, {name});
  return {namespaceKey, active, translations};
}

function parseCmsSectionPost(body: Record<string, unknown>): {
  sectionKey: string;
  subsectionKey: string;
  namespaceId: string;
  sectionType: string;
  active: boolean;
  registrationActive: boolean;
  translations: CmsNestedTranslations;
  videoImageUrl: string;
  videoLink: string;
  readMoreUrl: string;
} | null {
  const locale = normLocale(String(body.locale ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const sectionKey =
    typeof body.sectionKey === "string" ? body.sectionKey.trim() : "";
  const subsectionKey =
    typeof body.subsectionKey === "string" ? body.subsectionKey.trim() : "";
  if (!locale || !name || !sectionKey || !subsectionKey) return null;
  const namespaceId =
    typeof body.namespaceId === "string" ? body.namespaceId.trim() : "";
  const sectionTypeRaw =
    typeof body.sectionType === "string" ? body.sectionType.trim() : "";
  const sectionType = sectionTypeRaw || "site_settings";
  const active = typeof body.active === "boolean" ? body.active : true;
  const registrationActive = typeof body.registrationActive === "boolean" ?
    body.registrationActive :
    false;
  const videoImageUrl =
    typeof body.videoImageUrl === "string" ? body.videoImageUrl.trim() : "";
  const videoLink =
    typeof body.videoLink === "string" ? body.videoLink.trim() : "";
  const readMoreUrl =
    typeof body.readMoreUrl === "string" ? body.readMoreUrl.trim() : "";
  const block: Record<string, string> = {};
  for (const f of CMS_TRANSLATABLE_FIELDS) {
    const raw = body[f];
    if (typeof raw === "string") block[f] = raw;
  }
  if (!block.name) block.name = name;
  const country = normCmsCountryCode(
    String(body.countryCode ?? body.country ?? ""),
  );
  const translations = mergeCmsNestedLocaleBlock(
    {},
    country,
    locale,
    block,
  );
  return {
    sectionKey,
    subsectionKey,
    namespaceId,
    sectionType,
    active,
    registrationActive,
    translations,
    videoImageUrl,
    videoLink,
    readMoreUrl,
  };
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
    if (collection === "countries") {
      tr = normalizeLegacyCountryTranslations(existing);
    } else if (collection === "cmsNamespaces") {
      tr = normalizeLegacyLanguageTranslations(existing);
    } else if (collection === "cmsSections") {
      tr = {};
    } else {
      tr = {};
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
      const nested = serviceDocToNested(existing);
      const country = normCmsCountryCode(
        String(body.countryCode ?? body.country ?? ""),
      );
      patch.translations = mergeTranslationBlockNested(
        nested,
        country,
        locale,
        block,
      );
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
    } else if (collection === "languages") {
      const name =
        typeof body.name === "string" ? body.name.trim() : undefined;
      if (name === undefined) {
        return {patch: {}, error: "name requis avec locale"};
      }
      if (!name) {
        return {patch: {}, error: "name vide"};
      }
      const nested = languageDocToNested(existing);
      const country = normCmsCountryCode(
        String(body.countryCode ?? body.country ?? ""),
      );
      patch.translations = mergeTranslationBlockNested(
        nested,
        country,
        locale,
        {name},
      );
    } else if (collection === "cmsNamespaces") {
      const name =
        typeof body.name === "string" ? body.name.trim() : undefined;
      if (name === undefined) {
        return {patch: {}, error: "name requis avec locale"};
      }
      if (!name) {
        return {patch: {}, error: "name vide"};
      }
      patch.translations = mergeTranslations(tr, locale, {name});
    } else if (collection === "cmsSections") {
      const incoming: Record<string, string> = {};
      for (const f of CMS_TRANSLATABLE_FIELDS) {
        const raw = body[f];
        if (typeof raw === "string") incoming[f] = raw;
      }
      if (Object.keys(incoming).length === 0) {
        return {
          patch: {},
          error: "Au moins un champ traduisible requis avec locale",
        };
      }
      if (incoming.name !== undefined && !incoming.name.trim()) {
        return {patch: {}, error: "name vide"};
      }
      const country = normCmsCountryCode(
        String(body.countryCode ?? body.country ?? ""),
      );
      const nested = readNestedCmsFromDoc(existing);
      patch.translations = mergeCmsNestedLocaleBlock(
        nested,
        country,
        locale,
        incoming,
      );
    } else {
      return {patch: {}, error: "Collection inconnue pour locale"};
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

  if (collection === "services") {
    if (typeof body.imageUrl === "string") {
      patch.imageUrl = body.imageUrl.trim();
    }
  }

  if (collection === "cmsSections") {
    if (typeof body.sectionKey === "string") {
      const v = body.sectionKey.trim();
      if (!v) return {patch: {}, error: "sectionKey vide"};
      patch.sectionKey = v;
    }
    if (typeof body.subsectionKey === "string") {
      const v = body.subsectionKey.trim();
      if (!v) return {patch: {}, error: "subsectionKey vide"};
      patch.subsectionKey = v;
    }
    if (typeof body.namespaceId === "string") {
      patch.namespaceId = body.namespaceId.trim();
    }
    if (typeof body.sectionType === "string") {
      const v = body.sectionType.trim();
      if (!v) return {patch: {}, error: "sectionType vide"};
      patch.sectionType = v;
    }
    if (typeof body.videoImageUrl === "string") {
      patch.videoImageUrl = body.videoImageUrl.trim();
    }
    if (typeof body.videoLink === "string") {
      patch.videoLink = body.videoLink.trim();
    }
    if (typeof body.readMoreUrl === "string") {
      patch.readMoreUrl = body.readMoreUrl.trim();
    }
    if (typeof body.registrationActive === "boolean") {
      patch.registrationActive = body.registrationActive;
    }
  }

  if (collection === "cmsNamespaces") {
    if (typeof body.namespaceKey === "string") {
      const raw = body.namespaceKey.trim().toLowerCase();
      if (!/^[a-z][a-z0-9_-]{0,63}$/.test(raw)) {
        return {patch: {}, error: "namespaceKey invalide"};
      }
      patch.namespaceKey = raw;
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
        let trA: TranslationsMap;
        let trB: TranslationsMap;
        if (
          collection === "cmsSections" ||
          collection === "services" ||
          collection === "languages"
        ) {
          trA = flattenCmsForSort(
            (a as {translations?: CmsNestedTranslations}).translations ??
              {[CMS_DEFAULT_COUNTRY]: {}},
          );
          trB = flattenCmsForSort(
            (b as {translations?: CmsNestedTranslations}).translations ??
              {[CMS_DEFAULT_COUNTRY]: {}},
          );
        } else {
          trA = (a.translations ?? {}) as TranslationsMap;
          trB = (b.translations ?? {}) as TranslationsMap;
        }
        const fa = sortListFallback(collection, a as Record<string, unknown>);
        const fb = sortListFallback(collection, b as Record<string, unknown>);
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
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({
        success: false,
        error: "Corps JSON invalide (attendu un objet)",
      });
      return;
    }
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
        imageUrl: v.imageUrl,
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
    } else if (collection === "languages") {
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
    } else if (collection === "cmsNamespaces") {
      const v = parseNamespacePost(body);
      if (!v) {
        res.status(400).json({
          success: false,
          error:
            "Champs invalides (locale, name, namespaceKey requis)",
        });
        return;
      }
      payload = {
        namespaceKey: v.namespaceKey,
        active: v.active,
        translations: v.translations,
      };
    } else {
      const v = parseCmsSectionPost(body);
      if (!v) {
        res.status(400).json({
          success: false,
          error:
            "Champs invalides (sectionKey, subsectionKey, locale, name requis)",
        });
        return;
      }
      payload = {
        sectionKey: v.sectionKey,
        subsectionKey: v.subsectionKey,
        namespaceId: v.namespaceId,
        sectionType: v.sectionType,
        active: v.active,
        registrationActive: v.registrationActive,
        translations: v.translations,
        videoImageUrl: v.videoImageUrl,
        videoLink: v.videoLink,
        readMoreUrl: v.readMoreUrl,
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

  /**
   * Clé de dictionnaire interface admin (a-z, chiffres, ._-).
   * @param {string} raw Chaîne brute.
   * @return {string|null} Clé normalisée ou null.
   */
  function normUiDictionaryKey(raw: string): string | null {
    const k = raw.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_.-]{0,127}$/.test(k)) return null;
    return k;
  }

  router.get("/ui-dictionary", async (_req, res) => {
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
  });

  router.put("/ui-dictionary/:key", async (req, res) => {
    const key = normUiDictionaryKey(req.params.key ?? "");
    if (!key) {
      res.status(400).json({success: false, error: "Clé invalide"});
      return;
    }
    const body = req.body as Record<string, unknown>;
    const incoming: Record<string, string> = {};
    const trBody = body.translations;
    if (trBody && typeof trBody === "object" && !Array.isArray(trBody)) {
      for (const [k, v] of Object.entries(trBody as Record<string, unknown>)) {
        const nk = normUiDictLocaleKey(k);
        if (nk && typeof v === "string") incoming[nk] = v;
      }
    }
    if (typeof body.fr === "string") {
      const nk = normUiDictLocaleKey("fr");
      if (nk) incoming[nk] = body.fr;
    }
    if (typeof body.en === "string") {
      const nk = normUiDictLocaleKey("en");
      if (nk) incoming[nk] = body.en;
    }
    if (Object.keys(incoming).length === 0) {
      res.status(400).json({
        success: false,
        error: "Fournir translations (objet) et/ou fr / en (chaînes)",
      });
      return;
    }
    const ref = db.collection("adminUiDictionary").doc(key);
    const existing = await ref.get();
    const prev = (existing.data() ?? {}) as Record<string, unknown>;
    const prevMap = readUiDictionaryTranslations(prev);
    const merged = {...prevMap, ...incoming};
    // eslint-disable-next-line new-cap -- FieldValue.serverTimestamp
    const now = FieldValue.serverTimestamp();
    const payload: Record<string, unknown> = {
      translations: merged,
      updatedAt: now,
    };
    if (!existing.exists) {
      payload.createdAt = now;
    } else if (prev.createdAt !== undefined) {
      payload.createdAt = prev.createdAt;
    }
    try {
      await ref.set(payload, {merge: false});
      res.status(200).json({
        success: true,
        data: {key, translations: merged},
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  router.delete("/ui-dictionary/:key", async (req, res) => {
    const key = normUiDictionaryKey(req.params.key ?? "");
    if (!key) {
      res.status(400).json({success: false, error: "Clé invalide"});
      return;
    }
    try {
      await db.collection("adminUiDictionary").doc(key).delete();
      res.status(200).json({success: true});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.status(500).json({success: false, error: msg});
    }
  });

  return router;
}
