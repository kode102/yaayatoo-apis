/**
 * Point d’entrée Firebase Cloud Functions.
 * @see https://firebase.google.com/docs/functions
 */

import express from "express";
import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {createAdminRouter} from "./admin/router.js";
import {runSearchData} from "./search/handler.js";

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

const app = express();
app.use(express.json({limit: "2mb"}));
app.use(express.urlencoded({extended: true, limit: "2mb"}));

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
 * URL : …/yaayatoo/yaayatoo-get-api
 */
app.all("/yaayatoo-get-api", (req, res) => {
  void runSearchData(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({success: false, error: "Internal server error"});
    }
  });
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
