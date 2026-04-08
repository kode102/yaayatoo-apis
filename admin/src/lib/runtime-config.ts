/**
 * Config chargée au runtime (export statique).
 *
 * Dans le navigateur : on lit d’abord `/runtime-config.json` (fichier déployé)
 * pour que la prod puisse corriger l’URL API sans rebuild, même si le build CI
 * a embarqué une mauvaise NEXT_PUBLIC_YAAYATOO_API_BASE.
 * Sinon repli sur les variables NEXT_PUBLIC_*.
 */

const CONFIG_PATH = "/runtime-config.json";

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

/**
 * L’API admin doit viser la Cloud Function HTTPS, pas le domaine Hosting (web.app).
 * @param {string} base URL yaayatooApiBase (sans slash final).
 */
function assertYaayatooApiBase(base: string): void {
  const trimmed = base.trim();
  if (!trimmed) return;
  let host: string;
  try {
    host = new URL(trimmed).hostname.toLowerCase();
  } catch {
    throw new Error(
      "yaayatooApiBase n’est pas une URL valide (ex. " +
        "https://europe-west1-PROJET.cloudfunctions.net/yaayatoo).",
    );
  }
  const isFirebaseHostingHost =
    host.endsWith(".web.app") || host.endsWith(".firebaseapp.com");
  if (isFirebaseHostingHost) {
    throw new Error(
      "L’URL d’API pointe vers Firebase Hosting (site statique), pas vers la Cloud Function. " +
        "Mettez yaayatooApiBase sur l’URL HTTPS de la fonction « yaayatoo », par ex. " +
        "https://europe-west1-VOTRE_PROJECT.cloudfunctions.net/yaayatoo " +
        "(fichier admin/public/runtime-config.json ou variable NEXT_PUBLIC_YAAYATOO_API_BASE au build).",
    );
  }
}

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
  const mid = f.measurementId;
  if (typeof mid === "string" && mid) firebase.measurementId = mid;
  const yaayatooApiBase = String(o.yaayatooApiBase ?? "").trim();
  return {firebase, yaayatooApiBase};
}

async function loadFromNetwork(): Promise<RuntimeConfig | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const res = await fetch(CONFIG_PATH, {cache: "no-store"});
  if (!res.ok) {
    return null;
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
      const fromFile = await loadFromNetwork();
      if (fromFile?.yaayatooApiBase) {
        assertYaayatooApiBase(fromFile.yaayatooApiBase);
        cache = fromFile;
        return fromFile;
      }

      const envCfg = fromEnv();
      if (!envCfg) {
        if (typeof window === "undefined") {
          throw new Error(
            "Configuration Firebase indisponible au build : définissez NEXT_PUBLIC_* " +
              "ou fournissez public/runtime-config.json pour le client.",
          );
        }
        if (!fromFile) {
          throw new Error(
            `Impossible de charger ${CONFIG_PATH} et variables NEXT_PUBLIC_* incomplètes. ` +
              "Copiez runtime-config.example.json vers admin/public/runtime-config.json.",
          );
        }
        throw new Error(
          "yaayatooApiBase manquant dans runtime-config.json (URL de la fonction yaayatoo).",
        );
      }

      if (!envCfg.yaayatooApiBase) {
        throw new Error(
          "NEXT_PUBLIC_YAAYATOO_API_BASE est requis (ou yaayatooApiBase dans runtime-config.json).",
        );
      }
      assertYaayatooApiBase(envCfg.yaayatooApiBase);
      cache = envCfg;
      return envCfg;
    })();
  }
  return loadPromise;
}
