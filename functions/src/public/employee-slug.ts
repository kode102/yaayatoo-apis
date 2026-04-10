/**
 * Slug public employé pour les URLs : segment dérivé du nom + suffixe numérique
 * stable depuis l’id document Firestore (pas de champ métier requis).
 */

/**
 * @param {string} raw Nom affiché.
 * @return {string} Segment slug ASCII (tirets), ou vide.
 */
export function slugifyEmployeeNameSegment(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  try {
    return t
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  } catch {
    return "";
  }
}

/**
 * Suffixe numérique (8 chiffres) dérivé de l’id document — stable et unique
 * en pratique pour un même projet.
 * @param {string} employeeDocId Id Firestore collection `employee`.
 * @return {string} Chiffres.
 */
export function employeeNumericSuffix(employeeDocId: string): string {
  let h = 2166136261;
  const s = String(employeeDocId ?? "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = (Math.abs(h) % 90000000) + 10000000;
  return String(n);
}

/**
 * Slug pour chemins `/employee/{slug}` : `{nom}-{8 chiffres}` ou
 * `employee-{8 chiffres}` si le nom ne produit pas de segment utilisable.
 * @param {string} employeeDocId Id document employé.
 * @param {string} fullName Nom complet affiché.
 * @return {string} Slug URL.
 */
export function publicEmployeeSlug(
  employeeDocId: string,
  fullName: string,
): string {
  const namePart = slugifyEmployeeNameSegment(fullName);
  const num = employeeNumericSuffix(employeeDocId);
  return namePart ? `${namePart}-${num}` : `employee-${num}`;
}
