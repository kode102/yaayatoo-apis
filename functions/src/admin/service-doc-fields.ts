/**
 * Champs marketing / page service (Firestore, hors traductions régionales).
 */

import {FieldValue} from "firebase-admin/firestore";

const HEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function expandHex3(h: string): string {
  if (h.length !== 4) return h;
  const r = h[1];
  const g = h[2];
  const b = h[3];
  return `#${r}${r}${g}${g}${b}${b}`;
}

function normHexColor(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  if (!HEX.test(t)) return undefined;
  return expandHex3(t);
}

function normNonEmptyString(
  v: unknown,
  max: number,
): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, max);
  if (!t) return null;
  return t;
}

function normHtmlString(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.slice(0, max);
  if (!t.trim()) return null;
  return t;
}

export type ServiceActionButton = {
  text: string;
  linkOrRoute: string;
};

export type ServiceBenefit = {
  imageUrl?: string;
  title: string;
  description: string;
};

const MAX_LINK = 2048;
const MAX_FEATURE_LINE = 500;
const MAX_FEATURES = 24;
const MAX_BENEFITS = 16;
const MAX_BENEFIT_TITLE = 200;
const MAX_BENEFIT_DESC = 4000;

function parseAction(v: unknown): ServiceActionButton | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const text =
    typeof o.text === "string" ? o.text.trim().slice(0, 200) : "";
  const linkOrRoute =
    typeof o.linkOrRoute === "string" ?
      o.linkOrRoute.trim().slice(0, MAX_LINK) :
      "";
  if (!text && !linkOrRoute) return null;
  return {text, linkOrRoute};
}

function parseFeatureTexts(v: unknown): string[] | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return undefined;
    const t = item.trim().slice(0, MAX_FEATURE_LINE);
    if (t) out.push(t);
    if (out.length >= MAX_FEATURES) break;
  }
  return out;
}

function parseBenefits(v: unknown): ServiceBenefit[] | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (!Array.isArray(v)) return undefined;
  const out: ServiceBenefit[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return undefined;
    }
    const o = item as Record<string, unknown>;
    const title =
      typeof o.title === "string" ?
        o.title.trim().slice(0, MAX_BENEFIT_TITLE) :
        "";
    const description =
      typeof o.description === "string" ?
        o.description.trim().slice(0, MAX_BENEFIT_DESC) :
        "";
    if (!title && !description) continue;
    const imageUrlRaw = o.imageUrl;
    let imageUrl: string | undefined;
    if (typeof imageUrlRaw === "string") {
      const u = imageUrlRaw.trim().slice(0, MAX_LINK);
      if (u) imageUrl = u;
    }
    out.push({title, description, ...(imageUrl ? {imageUrl} : {})});
    if (out.length >= MAX_BENEFITS) break;
  }
  return out;
}

/**
 * Champs marketing optionnels pour POST service (création).
 * @param {Record<string, unknown>} body Corps JSON.
 * @return {Record<string, unknown>|null} Objet à fusionner ou erreur.
 */
export function parseServiceMarketingForCreate(
  body: Record<string, unknown>,
): {ok: true; fields: Record<string, unknown>} | {ok: false; error: string} {
  if (
    Object.prototype.hasOwnProperty.call(body, "color1") &&
    body.color1 !== undefined &&
    body.color1 !== null
  ) {
    const c1 = normHexColor(body.color1);
    if (c1 === undefined || c1 === null) {
      return {ok: false, error: "color1 invalide (hex #RGB ou #RRGGBB)"};
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "color2") &&
    body.color2 !== undefined &&
    body.color2 !== null
  ) {
    const c2 = normHexColor(body.color2);
    if (c2 === undefined || c2 === null) {
      return {ok: false, error: "color2 invalide (hex #RGB ou #RRGGBB)"};
    }
  }
  if (body.joinAction !== undefined && body.joinAction !== null) {
    if (parseAction(body.joinAction) === undefined) {
      return {
        ok: false,
        error: "joinAction : objet { text, linkOrRoute } attendu",
      };
    }
  }
  if (body.postAction !== undefined && body.postAction !== null) {
    if (parseAction(body.postAction) === undefined) {
      return {
        ok: false,
        error: "postAction : objet { text, linkOrRoute } attendu",
      };
    }
  }
  if (body.featureTexts !== undefined && body.featureTexts !== null) {
    if (parseFeatureTexts(body.featureTexts) === undefined) {
      return {ok: false, error: "featureTexts : tableau de chaînes attendu"};
    }
  }
  if (body.benefits !== undefined && body.benefits !== null) {
    if (parseBenefits(body.benefits) === undefined) {
      return {
        ok: false,
        error: "benefits : tableau d’objets { title, description, imageUrl? }",
      };
    }
  }

  const fields: Record<string, unknown> = {};
  const c1 = normHexColor(body.color1);
  if (c1 !== undefined && c1 !== null) {
    fields.color1 = c1;
  }
  const c2 = normHexColor(body.color2);
  if (c2 !== undefined && c2 !== null) {
    fields.color2 = c2;
  }
  const bImg = normNonEmptyString(body.bannerImageUrl, MAX_LINK);
  if (bImg !== undefined && bImg !== null) {
    fields.bannerImageUrl = bImg;
  }
  const fImg = normNonEmptyString(body.featureImageUrl, MAX_LINK);
  if (fImg !== undefined && fImg !== null) {
    fields.featureImageUrl = fImg;
  }
  const label = normHtmlString(body.labelHtml, 16_000);
  if (label !== undefined && label !== null) {
    fields.labelHtml = label;
  }
  const ja = parseAction(body.joinAction);
  if (ja !== undefined && ja !== null) {
    fields.joinAction = ja;
  }
  const pa = parseAction(body.postAction);
  if (pa !== undefined && pa !== null) {
    fields.postAction = pa;
  }
  const ft = parseFeatureTexts(body.featureTexts);
  if (ft !== undefined && ft !== null && ft.length > 0) {
    fields.featureTexts = ft;
  }
  const ben = parseBenefits(body.benefits);
  if (ben !== undefined && ben !== null && ben.length > 0) {
    fields.benefits = ben;
  }
  return {ok: true, fields};
}

/**
 * Applique les champs marketing sur un patch PUT (y compris suppressions).
 * @param {Record<string, unknown>} body Corps JSON.
 * @param {Record<string, unknown>} patch Patch Firestore.
 * @return {string|null} Message d’erreur ou null.
 */
export function applyServiceMarketingPatch(
  body: Record<string, unknown>,
  patch: Record<string, unknown>,
): string | null {
  const setDel = (key: string, val: unknown) => {
    if (!Object.prototype.hasOwnProperty.call(body, key)) return;
    if (val === null) {
      // eslint-disable-next-line new-cap -- FieldValue.delete()
      patch[key] = FieldValue.delete();
      return;
    }
    if (val === undefined) return;
    patch[key] = val;
  };

  if (Object.prototype.hasOwnProperty.call(body, "color1")) {
    const c = normHexColor(body.color1);
    if (c === undefined && body.color1 !== null) {
      return "color1 invalide (hex #RGB ou #RRGGBB)";
    }
    setDel("color1", c);
  }
  if (Object.prototype.hasOwnProperty.call(body, "color2")) {
    const c = normHexColor(body.color2);
    if (c === undefined && body.color2 !== null) {
      return "color2 invalide (hex #RGB ou #RRGGBB)";
    }
    setDel("color2", c);
  }

  if (Object.prototype.hasOwnProperty.call(body, "bannerImageUrl")) {
    const u = normNonEmptyString(body.bannerImageUrl, MAX_LINK);
    if (u === undefined && body.bannerImageUrl !== null) {
      return "bannerImageUrl invalide";
    }
    setDel("bannerImageUrl", u);
  }
  if (Object.prototype.hasOwnProperty.call(body, "featureImageUrl")) {
    const u = normNonEmptyString(body.featureImageUrl, MAX_LINK);
    if (u === undefined && body.featureImageUrl !== null) {
      return "featureImageUrl invalide";
    }
    setDel("featureImageUrl", u);
  }
  if (Object.prototype.hasOwnProperty.call(body, "labelHtml")) {
    const h = normHtmlString(body.labelHtml, 16_000);
    if (h === undefined && body.labelHtml !== null) {
      return "labelHtml invalide";
    }
    setDel("labelHtml", h);
  }

  if (Object.prototype.hasOwnProperty.call(body, "joinAction")) {
    const a = parseAction(body.joinAction);
    if (a === undefined && body.joinAction !== null) {
      return "joinAction : objet { text, linkOrRoute } attendu";
    }
    setDel("joinAction", a);
  }
  if (Object.prototype.hasOwnProperty.call(body, "postAction")) {
    const a = parseAction(body.postAction);
    if (a === undefined && body.postAction !== null) {
      return "postAction : objet { text, linkOrRoute } attendu";
    }
    setDel("postAction", a);
  }

  if (Object.prototype.hasOwnProperty.call(body, "featureTexts")) {
    const ft = parseFeatureTexts(body.featureTexts);
    if (ft === undefined && body.featureTexts !== null) {
      return "featureTexts : tableau de chaînes attendu";
    }
    setDel("featureTexts", ft);
  }

  if (Object.prototype.hasOwnProperty.call(body, "benefits")) {
    const b = parseBenefits(body.benefits);
    if (b === undefined && body.benefits !== null) {
      return "benefits : tableau d’objets { title, description, imageUrl? }";
    }
    setDel("benefits", b);
  }

  return null;
}
