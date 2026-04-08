import {getDownloadURL, ref, uploadBytes} from "firebase/storage";
import {getFirebaseStorage} from "@/lib/firebase";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Envoie une image service dans Firebase Storage et retourne l’URL de téléchargement.
 * Chemin : `admin/services/{serviceId|uploads}/{timestamp}_{uuid}.ext`
 *
 * Règles Storage : autoriser en écriture aux utilisateurs authentifiés sur `admin/services/**`.
 *
 * @param file Fichier image local.
 * @param opts.serviceId Si défini (édition), classe les fichiers sous ce dossier.
 * @return URL publique (token) pour `imageUrl` Firestore.
 */
export async function uploadServiceImageToStorage(
  file: File,
  opts: {serviceId?: string},
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("IMAGE_TYPE");
  }
  const ext = extFromMime(file.type);
  const id = randomId();
  const folder =
    opts.serviceId?.trim() ?
      `admin/services/${opts.serviceId.trim()}`
    : "admin/services/uploads";
  const path = `${folder}/${Date.now()}_${id}.${ext}`;
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000",
  });
  return getDownloadURL(storageRef);
}

export const SERVICE_IMAGE_MAX_BYTES = MAX_BYTES;
