/**
 * Slug public service pour les URLs : segment dérivé du libellé (FR par défaut)
 * + suffixe numérique stable depuis l’id document Firestore.
 */

import {
  CMS_DEFAULT_COUNTRY,
  resolveCmsBlock,
  type CmsNestedTranslations,
} from "../admin/cms-translations.js";
import {DEFAULT_LOCALE, normLocale} from "../admin/i18n.js";
import {
  employeeNumericSuffix,
  slugifyEmployeeNameSegment,
} from "./employee-slug.js";

/**
 * @param {Object|undefined} block Bloc traduction (label prioritaire sur name).
 * @return {string} Texte pour slug ou chaîne vide.
 */
function labelOrName(
  block: {label?: string; name?: string} | undefined,
): string {
  const lab = String(block?.label ?? "").trim();
  if (lab) return lab;
  return String(block?.name ?? "").trim();
}

/**
 * Premier libellé / nom non vide dans les traductions (repli si FR absent).
 * @param {CmsNestedTranslations} nested Traductions service normalisées.
 * @return {string} Texte pour slugifier.
 */
function firstNonEmptyServiceTitle(nested: CmsNestedTranslations): string {
  for (const map of Object.values(nested)) {
    if (!map || typeof map !== "object") continue;
    for (const block of Object.values(map)) {
      if (!block || typeof block !== "object") continue;
      const t = labelOrName(block as {label?: string; name?: string});
      if (t) return t;
    }
  }
  return "";
}

/**
 * Slug pour chemins `/services/{slug}` : `{nom-slug}-{8 chiffres}` ou
 * `service-{8 chiffres}` si aucun libellé exploitable.
 * @param {string} serviceDocId Id document collection `services`.
 * @param {CmsNestedTranslations} nested Champ `translations` normalisé.
 * @return {string} Segment d’URL.
 */
export function publicServiceSlug(
  serviceDocId: string,
  nested: CmsNestedTranslations,
): string {
  const locFr = normLocale(DEFAULT_LOCALE);
  const blockFr =
    resolveCmsBlock(nested, CMS_DEFAULT_COUNTRY, locFr) ??
    resolveCmsBlock(nested, CMS_DEFAULT_COUNTRY, "en");
  let basis = labelOrName(blockFr);
  if (!basis) basis = firstNonEmptyServiceTitle(nested);
  const namePart = slugifyEmployeeNameSegment(basis);
  const num = employeeNumericSuffix(serviceDocId);
  return namePart ? `${namePart}-${num}` : `service-${num}`;
}
