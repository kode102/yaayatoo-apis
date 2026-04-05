/**
 * Point d’entrée Firebase Cloud Functions.
 * @see https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

/**
 * Contrôle de santé pour load balancers / monitoring (GET ou HEAD).
 * URL après déploiement : …/health
 */
export const health = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.status(405);
      res.setHeader("Allow", "GET, HEAD");
      res.send("Method Not Allowed");
      return;
    }
    res.status(200).json({
      status: "ok",
      service: "yaayatoo-apis",
      timestamp: new Date().toISOString(),
    });
  },
);
