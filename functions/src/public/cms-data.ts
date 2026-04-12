/**
 * CMS public : sections par un ou plusieurs espaces (namespaces).
 */

import type {Request, Response} from "express";
import type {DocumentData} from "firebase-admin/firestore";
import {db} from "../lib/admin.js";
import {isPublicActiveDoc} from "../lib/public-active-doc.js";
import {
  flattenCmsForSort,
  normCmsCountryCode,
  resolveCmsBlock,
  toNestedCmsTranslations,
} from "../admin/cms-translations.js";
import {
  DEFAULT_LOCALE,
  normLocale,
  normalizeLegacyLanguageTranslations,
  pickSortLabel,
} from "../admin/i18n.js";

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
 * Normalise un document section CMS (traductions riches).
 * @param {string} id Id Firestore.
 * @param {DocumentData} data Données.
 * @return {Record<string, unknown>} Payload API.
 */
function normalizeCmsSection(
  id: string,
  data: DocumentData,
): Record<string, unknown> {
  const base = serializeDoc(id, data);
  base.translations = toNestedCmsTranslations(data.translations);
  return base;
}

/**
 * Normalise un document espace CMS.
 * @param {string} id Id Firestore.
 * @param {DocumentData} data Données.
 * @return {Record<string, unknown>} Payload API.
 */
function normalizeCmsNamespace(
  id: string,
  data: DocumentData,
): Record<string, unknown> {
  const base = serializeDoc(id, data);
  base.translations = normalizeLegacyLanguageTranslations(data);
  return base;
}

/**
 * @param {unknown} v Valeur query ou champ JSON.
 * @return {string[]} Liste de chaînes non vides.
 */
function normalizeStringList(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Lit namespaceKeys + namespaceIds depuis GET (query) ou POST (JSON).
 * @param {Request} req Requête Express.
 * @return {object} Objet avec keys et ids (tableaux de chaînes).
 */
function readCmsNamespaceParams(req: Request): {
  keys: string[];
  ids: string[];
} {
  if (
    req.method === "POST" &&
    req.body &&
    typeof req.body === "object" &&
    !Array.isArray(req.body)
  ) {
    const b = req.body as Record<string, unknown>;
    return {
      keys: normalizeStringList(b.namespaceKeys),
      ids: normalizeStringList(b.namespaceIds),
    };
  }
  const q = req.query;
  const keysRaw = q.namespaceKeys;
  const idsRaw = q.namespaceIds;
  return {
    keys: normalizeStringList(
      Array.isArray(keysRaw) ? keysRaw.join(",") : keysRaw,
    ),
    ids: normalizeStringList(Array.isArray(idsRaw) ? idsRaw.join(",") : idsRaw),
  };
}

/**
 * Locale pour tri des libellés (?locale= ou ?sortLocale=).
 * @param {Request} req Requête.
 * @return {string} Code locale normalisé.
 */
function readSortLocale(req: Request): string {
  const q = req.query.locale ?? req.query.sortLocale;
  const s = Array.isArray(q) ? q[0] : q;
  return normLocale(String(s ?? "")) || DEFAULT_LOCALE;
}

/**
 * Pays pour résoudre `resolvedTranslation` (?country= ou ?countryCode=, ISO2).
 * @param {Request} req Requête.
 * @return {string} Code normalisé ou défaut CMS.
 */
function readCmsCountry(req: Request): string {
  const q = req.query.country ?? req.query.countryCode;
  const s = Array.isArray(q) ? q[0] : q;
  return normCmsCountryCode(String(s ?? ""));
}

const FIRESTORE_IN_MAX = 30;

/** Clé d’espace CMS dans l’URL (même règle que création admin). */
const NAMESPACE_KEY_PATH_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export type PublicCmsBulkData = {
  namespaces: Record<string, unknown>[];
  sections: Record<string, unknown>[];
  byNamespace: Record<string, Record<string, unknown>[]>;
};

/**
 * Charge espaces + sections CMS publics pour les ids / clés demandés.
 *
 * @param {Set<string>} keySet Clés `namespaceKey` normalisées (minuscules).
 * @param {Set<string>} idSet Ids documents `cmsNamespaces`.
 * @param {string} sortLocale Locale de tri / résolution.
 * @param {string} cmsCountry Code pays CMS (ISO2 ou défaut).
 * @return {Promise<PublicCmsBulkData>} Payload `data` (sans enveloppe success).
 */
export async function buildPublicCmsData(
  keySet: Set<string>,
  idSet: Set<string>,
  sortLocale: string,
  cmsCountry: string,
): Promise<PublicCmsBulkData> {
  if (keySet.size === 0 && idSet.size === 0) {
    return {namespaces: [], sections: [], byNamespace: {}};
  }

  const nsSnap = await db.collection("cmsNamespaces").get();
  const byKey = new Map<string, {id: string; data: DocumentData}>();
  const byId = new Map<string, DocumentData>();
  for (const d of nsSnap.docs) {
    byId.set(d.id, d.data());
    const data = d.data();
    let nk = "";
    if (typeof data.namespaceKey === "string") {
      nk = data.namespaceKey.trim().toLowerCase();
    }
    if (nk) byKey.set(nk, {id: d.id, data});
  }

  const targetIds = new Set<string>();
  for (const id of idSet) {
    const data = byId.get(id);
    if (data && isPublicActiveDoc(data)) {
      targetIds.add(id);
    }
  }
  for (const k of keySet) {
    const found = byKey.get(k);
    if (found && isPublicActiveDoc(found.data)) {
      targetIds.add(found.id);
    }
  }

  if (targetIds.size === 0) {
    return {namespaces: [], sections: [], byNamespace: {}};
  }

  const namespaces: Record<string, unknown>[] = [];
  for (const nid of targetIds) {
    const data = byId.get(nid);
    if (!data) continue;
    const row = normalizeCmsNamespace(nid, data);
    if (!isPublicActiveDoc(row)) continue;
    namespaces.push(row);
  }

  const idList = [...targetIds];
  const sectionRows: Record<string, unknown>[] = [];
  for (const chunk of chunkIds(idList, FIRESTORE_IN_MAX)) {
    const secSnap = await db
      .collection("cmsSections")
      .where("namespaceId", "in", chunk)
      .get();
    for (const d of secSnap.docs) {
      const row = normalizeCmsSection(d.id, d.data());
      if (!isPublicActiveDoc(row)) continue;
      const nested = toNestedCmsTranslations(row.translations);
      row.resolvedTranslation = resolveCmsBlock(
        nested,
        cmsCountry,
        sortLocale,
      ) ?? null;
      const nsId = String(row.namespaceId ?? "");
      const nsRec = byId.get(nsId);
      if (nsRec && typeof nsRec.namespaceKey === "string") {
        row.namespaceKey = nsRec.namespaceKey.trim();
      }
      sectionRows.push(row);
    }
  }

  sectionRows.sort((a, b) => {
    const trA = flattenCmsForSort(
      toNestedCmsTranslations(a.translations),
    );
    const trB = flattenCmsForSort(
      toNestedCmsTranslations(b.translations),
    );
    const fa = String(a.subsectionKey ?? a.id);
    const fb = String(b.subsectionKey ?? b.id);
    return pickSortLabel(trA, sortLocale, fa).localeCompare(
      pickSortLabel(trB, sortLocale, fb),
      "fr",
    );
  });

  const byNamespace: Record<string, Record<string, unknown>[]> = {};
  for (const nid of targetIds) {
    byNamespace[nid] = [];
  }
  for (const row of sectionRows) {
    const nid = String(row.namespaceId ?? "");
    if (nid && Object.prototype.hasOwnProperty.call(byNamespace, nid)) {
      byNamespace[nid].push(row);
    }
  }

  return {
    namespaces,
    sections: sectionRows,
    byNamespace,
  };
}

/**
 * Découpe un tableau en paquets pour les requêtes `in`.
 * @param {string[]} ids Identifiants.
 * @param {number} size Taille max par paquet.
 * @return {Array<Array<string>>} Paquets.
 */
function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

/**
 * GET ou POST /public/cms — sections CMS pour un ou plusieurs espaces.
 *
 * Query / corps JSON :
 * - `namespaceKeys` : clés techniques (ex. home,contact), virgules
 * - `namespaceIds` : ids Firestore des documents cmsNamespaces
 *
 * Les deux peuvent être combinés (union). Au moins un paramètre requis.
 *
 * @param {Request} req Requête.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicCms(req: Request, res: Response): Promise<void> {
  try {
    const {keys: rawKeys, ids: rawIds} = readCmsNamespaceParams(req);
    const keySet = new Set(
      rawKeys
        .map((k) => k.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
        .filter(Boolean),
    );
    const idSet = new Set(rawIds.filter(Boolean));

    if (keySet.size === 0 && idSet.size === 0) {
      res.status(400).json({
        success: false,
        error:
          "Fournir namespaceKeys et/ou namespaceIds (liste non vide)",
      });
      return;
    }

    const sortLocale = readSortLocale(req);
    const cmsCountry = readCmsCountry(req);
    const data = await buildPublicCmsData(
      keySet,
      idSet,
      sortLocale,
      cmsCountry,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}

/**
 * GET /public/cms/namespace/:namespaceKey — un espace par clé technique
 * (document `namespace` + `sections` + `resolvedTranslation` par ligne).
 *
 * @param {Request} req Requête.
 * @param {Response} res Réponse JSON.
 * @return {Promise<void>}
 */
export async function getPublicCmsByNamespaceKey(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const raw = String(req.params.namespaceKey ?? "").trim().toLowerCase();
    if (!raw || !NAMESPACE_KEY_PATH_RE.test(raw)) {
      res.status(400).json({
        success: false,
        error:
          "namespaceKey invalide (ex. service, home — lettres minuscules, " +
          "chiffres, _ et -)",
      });
      return;
    }

    const sortLocale = readSortLocale(req);
    const cmsCountry = readCmsCountry(req);
    const data = await buildPublicCmsData(
      new Set([raw]),
      new Set(),
      sortLocale,
      cmsCountry,
    );

    res.status(200).json({
      success: true,
      data: {
        namespaceKey: raw,
        namespace: data.namespaces[0] ?? null,
        sections: data.sections,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
}
