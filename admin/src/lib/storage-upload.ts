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

async function uploadValidatedImageToFolder(
  file: File,
  folder: string,
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("IMAGE_TYPE");
  }
  const ext = extFromMime(file.type);
  const id = randomId();
  const path = `${folder}/${Date.now()}_${id}.${ext}`;
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000",
  });
  return getDownloadURL(storageRef);
}

export type ServiceImageVariant = "main" | "banner" | "feature" | "benefit";

/**
 * Envoie une image service dans Firebase Storage et retourne l’URL de téléchargement.
 * Chemin : `admin/services/{serviceId|uploads}/…` (+ sous-dossiers banner, feature, benefits).
 *
 * Règles Storage : autoriser en écriture aux utilisateurs authentifiés sur `admin/services/**`.
 *
 * @param file Fichier image local.
 * @param opts.serviceId Si défini (édition), classe les fichiers sous ce dossier.
 * @param opts.variant Sous-dossier pour bannière / visuel / picto avantage.
 * @param opts.benefitKey Sous-chemin stable pour un bloc avantage (ex. index).
 * @return URL publique (token) pour `imageUrl` Firestore.
 */
export async function uploadServiceImageToStorage(
  file: File,
  opts: {
    serviceId?: string;
    variant?: ServiceImageVariant;
    benefitKey?: string;
  },
): Promise<string> {
  const variant = opts.variant ?? "main";
  const base =
    opts.serviceId?.trim() ?
      `admin/services/${opts.serviceId.trim()}`
    : "admin/services/uploads";
  let folder = base;
  if (variant === "banner") {
    folder = `${base}/banner`;
  } else if (variant === "feature") {
    folder = `${base}/feature`;
  } else if (variant === "benefit") {
    const k = opts.benefitKey?.trim() || randomId();
    folder = `${base}/benefits/${k}`;
  }
  return uploadValidatedImageToFolder(file, folder);
}

/**
 * Miniature vidéo CMS (« Why choose us ») : `admin/cms/video-thumbnails/{sectionId|uploads}/…`
 */
export async function uploadCmsVideoThumbnailToStorage(
  file: File,
  opts: {sectionId?: string},
): Promise<string> {
  const folder =
    opts.sectionId?.trim() ?
      `admin/cms/video-thumbnails/${opts.sectionId.trim()}`
    : "admin/cms/video-thumbnails/uploads";
  return uploadValidatedImageToFolder(file, folder);
}

/**
 * Photo profil employé : `admin/employees/{uid}/…` (règles Storage : auth sur ce préfixe).
 */
export async function uploadEmployeeProfileImageToStorage(
  file: File,
  opts: {employeeUid?: string},
): Promise<string> {
  const folder =
    opts.employeeUid?.trim() ?
      `admin/employees/${opts.employeeUid.trim()}`
    : "admin/employees/uploads";
  return uploadValidatedImageToFolder(file, folder);
}

/**
 * Photo profil employeur : `admin/employers/{uid}/…`
 */
export async function uploadEmployerProfileImageToStorage(
  file: File,
  opts: {employerUid?: string},
): Promise<string> {
  const folder =
    opts.employerUid?.trim() ?
      `admin/employers/${opts.employerUid.trim()}`
    : "admin/employers/uploads";
  return uploadValidatedImageToFolder(file, folder);
}

/**
 * Icône d'un service à la demande : `admin/on-demand-services/{docId|uploads}/`
 */
export async function uploadOnDemandServiceIconToStorage(
  file: File,
  opts: {docId?: string},
): Promise<string> {
  const folder =
    opts.docId?.trim() ?
      `admin/on-demand-services/${opts.docId.trim()}`
    : "admin/on-demand-services/uploads";
  return uploadValidatedImageToFolder(file, folder);
}

export const SERVICE_IMAGE_MAX_BYTES = MAX_BYTES;
