/** Clés alignées sur `Home.about_page` du site (snake_case). */
export const ABOUT_PAGE_TEMPLATE_FIELD_KEYS = [
  "meta_title",
  "meta_description",
  "title",
  "hero_lead",
  "hero_image_url",
  "hero_image_alt",
  "story_heading",
  "story_p1",
  "story_p2",
  "story_p3",
  "mission_heading",
  "mission_li1_lead",
  "mission_li1_text",
  "mission_li2_lead",
  "mission_li2_text",
  "mission_li3_lead",
  "mission_li3_text",
  "mission_closing",
  "values_heading",
  "value_trust_title",
  "value_trust_body",
  "value_simple_title",
  "value_simple_body",
  "value_fair_title",
  "value_fair_body",
  "pillars_heading",
  "pillar_1_title",
  "pillar_1_text",
  "pillar_2_title",
  "pillar_2_text",
  "pillar_3_title",
  "pillar_3_text",
  "cta_heading",
  "cta_body",
  "cta_contact",
  "cta_services",
] as const;

export type AboutPageTemplateFieldKey =
  (typeof ABOUT_PAGE_TEMPLATE_FIELD_KEYS)[number];

const TEXTAREA_ROWS: Partial<Record<AboutPageTemplateFieldKey, number>> = {
  meta_description: 2,
  hero_lead: 3,
  story_p1: 3,
  story_p2: 3,
  story_p3: 3,
  mission_li1_text: 2,
  mission_li2_text: 2,
  mission_li3_text: 2,
  mission_closing: 2,
  value_trust_body: 3,
  value_simple_body: 3,
  value_fair_body: 3,
  pillar_1_text: 3,
  pillar_2_text: 3,
  pillar_3_text: 3,
  cta_body: 2,
};

export function textareaRowsForAboutField(
  key: AboutPageTemplateFieldKey,
): number {
  return TEXTAREA_ROWS[key] ?? 2;
}

export function emptyAboutLocaleDraft(): Record<AboutPageTemplateFieldKey, string> {
  return Object.fromEntries(
    ABOUT_PAGE_TEMPLATE_FIELD_KEYS.map((k) => [k, ""]),
  ) as Record<AboutPageTemplateFieldKey, string>;
}

export type AboutLocaleCode = "en" | "fr";

export function defaultAboutDraftsByLocale(): Record<
  AboutLocaleCode,
  Record<AboutPageTemplateFieldKey, string>
> {
  return {
    en: emptyAboutLocaleDraft(),
    fr: emptyAboutLocaleDraft(),
  };
}
