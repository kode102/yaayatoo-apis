/**
 * Point d’entrée Firebase Cloud Functions.
 * @see https://firebase.google.com/docs/functions
 */

import express from "express";
import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {createAdminRouter} from "./admin/router.js";
import {db} from "./lib/admin.js";
import {getPublicCms} from "./public/cms-data.js";
import {
  getPublicCatalog,
  getPublicCountries,
  getPublicLanguages,
  getPublicServices,
} from "./public/reference-data.js";
import {runSearchData} from "./search/handler.js";
import {mountSwagger} from "./swagger/setup-swagger.js";

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

const app = express();

/**
 * CORS global (admin sur domaine personnalisé → Cloud Function cross-origin).
 * @param {express.Request} req Requête.
 * @param {express.Response} res Réponse.
 * @param {express.NextFunction} next Suite.
 */
function globalCors(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const origin = req.get("Origin");
  res.set("Access-Control-Allow-Origin", origin ?? "*");
  res.set("Vary", "Origin");
  res.set(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, DELETE, OPTIONS",
  );
  res.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  res.set("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  next();
}

app.use(globalCors);

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      const r = req as express.Request & {rawBody?: Buffer};
      if (Buffer.isBuffer(buf) && buf.length > 0) {
        r.rawBody = buf;
      }
    },
  }),
);
app.use(express.urlencoded({extended: true, limit: "2mb"}));

/**
 * Cloud Functions peut fournir le corps brut alors qu’express.json n’a rien
 * rempli (certaines passerelles). Réessaie un parse JSON depuis rawBody.
 * @param {express.Request} req Requête.
 * @param {express.Response} _res Réponse (non utilisée).
 * @param {express.NextFunction} next Suite.
 */
function reviveJsonBody(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
): void {
  const needsBody = req.method === "POST" || req.method === "PUT";
  const body = req.body;
  const empty =
    body === undefined ||
    body === null ||
    (typeof body === "object" && Object.keys(body as object).length === 0);
  if (!needsBody || !empty) {
    next();
    return;
  }
  const raw = (req as express.Request & {rawBody?: Buffer}).rawBody;
  if (Buffer.isBuffer(raw) && raw.length > 0) {
    try {
      req.body = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
    } catch {
      /* laissera le corps vide ; le routeur renverra 400 si besoin */
    }
  }
  next();
}

app.use(reviveJsonBody);

mountSwagger(app);

/**
 * Corps JSON du health check.
 * @return {{status: string, service: string, timestamp: string}} Charge utile.
 */
function healthPayload() {
  return {
    status: "ok",
    service: "yaayatoo-apis",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Réponse health JSON.
 * @param {express.Request} _req Requête (non utilisée).
 * @param {express.Response} res Réponse HTTP.
 */
function sendHealth(_req: express.Request, res: express.Response): void {
  res.status(200).json(healthPayload());
}

app.get("/", sendHealth);
app.head("/", (_req, res) => {
  res.status(200).end();
});
app.get("/health", sendHealth);
app.head("/health", (_req, res) => {
  res.status(200).end();
});

/**
 * Liste / recherche Firestore (GET query ou POST JSON).
 * URL : …/yaayatoo/get
 */
app.all("/get", (req, res) => {
  void runSearchData(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({success: false, error: "Internal server error"});
    }
  });
});

/**
 * Langues actives (site vitrine + admin) — sans authentification.
 * Libellés Firestore (priorité fr, en, puis première dispo).
 */
app.get("/public/active-languages", async (_req, res) => {
  try {
    const snap = await db.collection("languages").get();
    type Tr = Record<string, {name?: string} | undefined> | undefined;
    const rows = snap.docs
      .map((d) => {
        const x = d.data() as {
          active?: boolean;
          code?: string;
          flagIconUrl?: string;
          translations?: Tr;
        };
        if (x.active === false) return null;
        const code = String(x.code ?? d.id)
          .trim()
          .toLowerCase();
        if (!code) return null;
        const tr = x.translations ?? {};
        const label =
          tr.fr?.name?.trim() ||
          tr.en?.name?.trim() ||
          Object.values(tr).find((b) => b?.name?.trim())?.name?.trim() ||
          code.toUpperCase();
        return {
          id: d.id,
          code,
          label,
          flagIconUrl: typeof x.flagIconUrl === "string" ? x.flagIconUrl : "",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    rows.sort((a, b) => a.code.localeCompare(b.code, "fr"));
    res.status(200).json({success: true, data: rows});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    res.status(500).json({success: false, error: msg});
  }
});

/**
 * Pays actifs (traductions, code ISO, drapeau) — sans authentification.
 * Tri des libellés : ?locale= ou ?sortLocale= (défaut fr).
 */
app.get("/public/countries", (req, res) => {
  void getPublicCountries(req, res);
});

/**
 * Langues actives (schéma Firestore complet) — sans authentification.
 * Pour une liste légère (code, label, drapeau), voir /public/active-languages.
 */
app.get("/public/languages", (req, res) => {
  void getPublicLanguages(req, res);
});

/** Services actifs — sans authentification. */
app.get("/public/services", (req, res) => {
  void getPublicServices(req, res);
});

/** Catalogue : pays + langues + services actifs en un GET. */
app.get("/public/catalog", (req, res) => {
  void getPublicCatalog(req, res);
});

/**
 * CMS vitrine : espaces + sections pour un ou plusieurs namespaces
 * (?namespaceKeys=home,contact ou ?namespaceIds=…). POST JSON équivalent.
 */
app.get("/public/cms", (req, res) => {
  void getPublicCms(req, res);
});
app.post("/public/cms", (req, res) => {
  void getPublicCms(req, res);
});

/** CRUD admin (Auth Firebase + option ADMIN_ALLOWED_EMAILS). */
app.use("/admin", createAdminRouter());

/**
 * API unique : santé + données Firestore.
 * Base : …/yaayatoo
 */
export const yaayatoo = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  app,
);
