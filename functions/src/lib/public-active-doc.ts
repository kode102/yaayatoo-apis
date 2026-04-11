/**
 * Règle vitrine : les documents avec `active: false` ne sont pas exposés
 * sur les routes publiques (site). L’admin liste tout.
 */

import type {DocumentData} from "firebase-admin/firestore";

/**
 * @param {DocumentData|Record<string, unknown>|null|undefined} data
 *     Données document.
 * @return {boolean} true si le document peut être exposé au public.
 */
export function isPublicActiveDoc(
  data: DocumentData | Record<string, unknown> | null | undefined,
): boolean {
  if (!data || typeof data !== "object") return false;
  return (data as {active?: boolean}).active !== false;
}
