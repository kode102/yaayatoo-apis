import {getApp, getApps, initializeApp, type FirebaseApp} from "firebase/app";
import {getAuth, type Auth} from "firebase/auth";
import {getRuntimeConfig} from "@/lib/runtime-config";

let initPromise: Promise<FirebaseApp> | null = null;

/**
 * Initialise Firebase (une seule fois). À appeler avant getFirebaseAuth().
 * @return {Promise<FirebaseApp>} Instance app.
 */
export async function ensureFirebaseApp(): Promise<FirebaseApp> {
  if (getApps().length > 0) {
    return getApp();
  }
  if (!initPromise) {
    initPromise = (async () => {
      const {firebase: cfg} = await getRuntimeConfig();
      return initializeApp(cfg);
    })();
  }
  return initPromise;
}

/**
 * Auth Firebase (après ensureFirebaseApp()).
 * @return {Auth} Instance Auth.
 */
export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}
