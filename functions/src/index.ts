/**
 * Point d’entrée Firebase Cloud Functions.
 * @see https://firebase.google.com/docs/functions
 */

import express from "express";
import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {createAdminRouter} from "./admin/router.js";
import {db} from "./lib/admin.js";
import {
  getPublicCms,
  getPublicCmsByNamespaceKey,
} from "./public/cms-data.js";
import {
  getPublicCatalog,
  getPublicCountries,
  getPublicLanguages,
  getPublicOnDemandServiceDetail,
  getPublicOnDemandServices,
  getPublicOnDemandServicesForPlacementService,
  getPublicServiceDetail,
  getPublicServices,
} from "./public/reference-data.js";
import {getPublicSiteMediaByTag} from "./public/site-media-public.js";
import {graphQlGet, graphQlPost} from "./public/graphql-graph-route.js";
import {getPublicUiDictionary} from "./public/ui-dictionary-public.js";
import {getPublicJobReviews} from "./public/job-reviews-public.js";
import {getPublicHomeProfiles} from "./public/employees-public.js";
import {getPublicCmsSettings} from "./public/cms-settings.js";
import {getPublicNewsFeed} from "./public/news-feed.js";
import {
  CMS_DEFAULT_COUNTRY,
  normCmsCountryCode,
  resolveCmsBlock,
} from "./admin/cms-translations.js";
import {DEFAULT_LOCALE, normLocale} from "./admin/i18n.js";
import {languageDocToNested} from "./admin/reference-nested.js";
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
app.get("/public/active-languages", async (req, res) => {
  try {
    const qLoc = req.query.locale ?? req.query.sortLocale;
    const locRaw = Array.isArray(qLoc) ? qLoc[0] : qLoc;
    const sortLocale = normLocale(String(locRaw ?? "")) || DEFAULT_LOCALE;
    const qCc = req.query.country ?? req.query.countryCode;
    const ccRaw = Array.isArray(qCc) ? qCc[0] : qCc;
    const country = normCmsCountryCode(String(ccRaw ?? ""));
    const snap = await db.collection("languages").get();
    const rows = snap.docs
      .map((d) => {
        const x = d.data() as {
          active?: boolean;
          code?: string;
          flagIconUrl?: string;
        };
        if (x.active === false) return null;
        const code = String(x.code ?? d.id)
          .trim()
          .toLowerCase();
        if (!code) return null;
        const nested = languageDocToNested(d.data());
        const resolved = resolveCmsBlock(nested, country, sortLocale);
        const defMap = nested[CMS_DEFAULT_COUNTRY] ?? {};
        const label =
          resolved?.name?.trim() ||
          defMap[sortLocale]?.name?.trim() ||
          defMap.fr?.name?.trim() ||
          defMap.en?.name?.trim() ||
          Object.values(defMap).find((b) => b?.name?.trim())?.name?.trim() ||
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

/** Détail service actif (id ou slug). Préférer à la liste pour la perf. */
app.get("/public/services/:serviceKey", (req, res) => {
  void getPublicServiceDetail(req, res);
});

/** Services actifs — sans authentification. */
app.get("/public/services", (req, res) => {
  void getPublicServices(req, res);
});

/**
 * Services à la demande liés à un service de placement (id ou slug URL).
 * Doit précéder la route générique `:serviceKey`.
 */
app.get(
  "/public/on-demand-services/by-service/:placementServiceKey",
  (req, res) => {
    void getPublicOnDemandServicesForPlacementService(req, res);
  },
);

/** Détail d’un service à la demande (id ou slug). */
app.get("/public/on-demand-services/:serviceKey", (req, res) => {
  void getPublicOnDemandServiceDetail(req, res);
});

/** Services à la demande actifs — sans authentification. */
app.get("/public/on-demand-services", (req, res) => {
  void getPublicOnDemandServices(req, res);
});

/** Médias vitrine par tag (ex. bannière page service). */
app.get("/public/site-media/tag/:tag", (req, res) => {
  void getPublicSiteMediaByTag(req, res);
});

/** Catalogue : pays + langues + services actifs en un GET. */
app.get("/public/catalog", (req, res) => {
  void getPublicCatalog(req, res);
});

/**
 * CMS vitrine : un espace par clé (`service`, `home`…). Même contenu que
 * `GET /public/cms?namespaceKeys=…` pour une seule clé, réponse structurée
 * (`namespace` + `sections`).
 */
app.get("/public/cms/namespace/:namespaceKey", (req, res) => {
  void getPublicCmsByNamespaceKey(req, res);
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

/**
 * Dictionnaire UI (clés type `Header.login` → textes par locale) — vitrine
 * Next.js.
 */
app.get("/public/ui-dictionary", (req, res) => {
  void getPublicUiDictionary(req, res);
});

/** Réglages CMS publics (contacts / stores / réseaux). */
app.get("/public/cms-settings", (req, res) => {
  void getPublicCmsSettings(req, res);
});

/** Bandeau Blog & News (footer). */
app.get("/public/news-feed", (req, res) => {
  void getPublicNewsFeed(req, res);
});

/** Avis publics jobReviews (filtre minRating) + employeur / employé. */
app.get("/public/job-reviews", (req, res) => {
  void getPublicJobReviews(req, res);
});

/** Profils employés (accueil) : max 10, priorité badge, mélange aléatoire. */
app.get("/public/home-profiles", (req, res) => {
  void getPublicHomeProfiles(req, res);
});

/**
 * GraphQL (schéma minimal) — réservé usage futur ; la vitrine utilise REST.
 * POST JSON : `{ "query": "{ ping }" }`
 */
app.get("/graph", (req, res) => {
  void graphQlGet(req, res);
});
app.post("/graph", (req, res) => {
  void graphQlPost(req, res);
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
