import type {ServiceBenefit, ServiceDoc} from "@/lib/i18n-types";

export type ServiceMarketingDraft = {
  color1: string;
  color2: string;
  bannerImageUrl: string;
  featureImageUrl: string;
  labelHtml: string;
  joinText: string;
  joinLink: string;
  postText: string;
  postLink: string;
  featureTexts: string[];
  benefits: ServiceBenefit[];
};

const DEFAULT_C1 = "#667eea";
const DEFAULT_C2 = "#764ba2";

export function emptyServiceMarketingDraft(): ServiceMarketingDraft {
  return {
    color1: DEFAULT_C1,
    color2: DEFAULT_C2,
    bannerImageUrl: "",
    featureImageUrl: "",
    labelHtml: "",
    joinText: "",
    joinLink: "",
    postText: "",
    postLink: "",
    featureTexts: [""],
    benefits: [],
  };
}

export function serviceMarketingDraftFromDoc(row: ServiceDoc): ServiceMarketingDraft {
  return {
    color1: row.color1?.trim() || DEFAULT_C1,
    color2: row.color2?.trim() || DEFAULT_C2,
    bannerImageUrl: row.bannerImageUrl ?? "",
    featureImageUrl: row.featureImageUrl ?? "",
    labelHtml: row.labelHtml ?? "",
    joinText: row.joinAction?.text ?? "",
    joinLink: row.joinAction?.linkOrRoute ?? "",
    postText: row.postAction?.text ?? "",
    postLink: row.postAction?.linkOrRoute ?? "",
    featureTexts:
      row.featureTexts && row.featureTexts.length > 0 ?
        [...row.featureTexts]
      : [""],
    benefits: row.benefits?.length ? row.benefits.map((b) => ({...b})) : [],
  };
}

/**
 * Corps JSON pour PUT/PATCH admin (null = suppression Firestore).
 */
export function serviceMarketingDraftToApiPatch(
  d: ServiceMarketingDraft,
): Record<string, unknown> {
  const lines = d.featureTexts.map((s) => s.trim()).filter(Boolean);
  const benefits: ServiceBenefit[] = d.benefits
    .map((b) => ({
      title: b.title.trim(),
      description: b.description.trim(),
      ...(b.imageUrl?.trim() ? {imageUrl: b.imageUrl.trim()} : {}),
    }))
    .filter((b) => b.title || b.description);

  const join =
    d.joinText.trim() || d.joinLink.trim() ?
      {
        text: d.joinText.trim(),
        linkOrRoute: d.joinLink.trim(),
      }
    : null;
  const post =
    d.postText.trim() || d.postLink.trim() ?
      {
        text: d.postText.trim(),
        linkOrRoute: d.postLink.trim(),
      }
    : null;

  return {
    color1: d.color1.trim() ? d.color1.trim() : null,
    color2: d.color2.trim() ? d.color2.trim() : null,
    bannerImageUrl: d.bannerImageUrl.trim() || null,
    featureImageUrl: d.featureImageUrl.trim() || null,
    labelHtml: d.labelHtml.trim() ? d.labelHtml : null,
    joinAction: join,
    postAction: post,
    featureTexts: lines.length ? lines : null,
    benefits: benefits.length ? benefits : null,
  };
}
