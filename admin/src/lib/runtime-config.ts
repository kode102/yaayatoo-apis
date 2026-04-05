/**
 * Config chargée au runtime (export statique : pas de variables NEXT_PUBLIC au build CI).
 * Ordre : variables d’environnement (.env.local) puis GET /admin/runtime-config.json
 */

const CONFIG_PATH = "/admin/runtime-config.json";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export type RuntimeConfig = {
  firebase: FirebaseWebConfig;
  /** URL de la Cloud Function `yaayatoo` (sans slash final). */
  yaayatooApiBase: string;
};

let cache: RuntimeConfig | null = null;
let loadPromise: Promise<RuntimeConfig> | null = null;

function fromEnv(): RuntimeConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const yaayatooApiBase = process.env.NEXT_PUBLIC_YAAYATOO_API_BASE?.trim() ?? "";

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  const firebase: FirebaseWebConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
  const mid = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (mid) firebase.measurementId = mid;

  return {firebase, yaayatooApiBase};
}

function parseJson(data: unknown): RuntimeConfig {
  if (!data || typeof data !== "object") {
    throw new Error("runtime-config.json invalide");
  }
  const o = data as Record<string, unknown>;
  const fb = o.firebase;
  if (!fb || typeof fb !== "object") {
    throw new Error("runtime-config.json : champ firebase manquant");
  }
  const f = fb as Record<string, unknown>;
  const firebase: FirebaseWebConfig = {
    apiKey: String(f.apiKey ?? ""),
    authDomain: String(f.authDomain ?? ""),
    projectId: String(f.projectId ?? ""),
    storageBucket: String(f.storageBucket ?? ""),
    messagingSenderId: String(f.messagingSenderId ?? ""),
    appId: String(f.appId ?? ""),
  };
  if (!firebase.apiKey || !firebase.authDomain || !firebase.projectId) {
    throw new Error("runtime-config.json : firebase incomplet");
  }
  const yaayatooApiBase = String(o.yaayatooApiBase ?? "").trim();
  return {firebase, yaayatooApiBase};
}

async function loadFromNetwork(): Promise<RuntimeConfig> {
  if (typeof window === "undefined") {
    throw new Error(
      "Configuration Firebase indisponible au build : définissez NEXT_PUBLIC_* " +
        "ou fournissez public/runtime-config.json pour le client.",
    );
  }
  const res = await fetch(CONFIG_PATH, {cache: "no-store"});
  if (!res.ok) {
    throw new Error(
      `Impossible de charger ${CONFIG_PATH} (${res.status}). ` +
        "Copiez runtime-config.example.json vers runtime-config.json dans admin/public/.",
    );
  }
  return parseJson(await res.json());
}

/**
 * Config admin (Firebase web + URL API). Mise en cache après premier chargement.
 * @return {Promise<RuntimeConfig>} Config résolue.
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      const envCfg = fromEnv();
      if (envCfg) {
        if (!envCfg.yaayatooApiBase) {
          throw new Error(
            "NEXT_PUBLIC_YAAYATOO_API_BASE est requis (ou yaayatooApiBase dans runtime-config.json).",
          );
        }
        return envCfg;
      }
      const net = await loadFromNetwork();
      if (!net.yaayatooApiBase) {
        throw new Error(
          "yaayatooApiBase manquant dans runtime-config.json (URL de la fonction yaayatoo).",
        );
      }
      return net;
    })();
  }
  cache = await loadPromise;
  return cache;
}
