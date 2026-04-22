"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";
import {
  ABOUT_PAGE_TEMPLATE_FIELD_KEYS,
  type AboutLocaleCode,
  type AboutPageTemplateFieldKey,
  defaultAboutDraftsByLocale,
  emptyAboutLocaleDraft,
  textareaRowsForAboutField,
} from "./about-page-template-fields";

type Props = {
  activeLocale: AboutLocaleCode;
  onLocaleChange: (loc: AboutLocaleCode) => void;
  drafts: Record<AboutLocaleCode, Record<AboutPageTemplateFieldKey, string>>;
  onFieldChange: (
    loc: AboutLocaleCode,
    key: AboutPageTemplateFieldKey,
    value: string,
  ) => void;
};

function humanFieldLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function mergeAboutDraftsFromDoc(
  raw: unknown,
): Record<AboutLocaleCode, Record<AboutPageTemplateFieldKey, string>> {
  const base = defaultAboutDraftsByLocale();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const root = raw as Record<string, unknown>;
  for (const loc of ["en", "fr"] as AboutLocaleCode[]) {
    const block = root[loc];
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const b = block as Record<string, unknown>;
    for (const key of ABOUT_PAGE_TEMPLATE_FIELD_KEYS) {
      if (typeof b[key] === "string") {
        base[loc][key] = b[key] as string;
      }
    }
  }
  return base;
}

export function buildAboutPageByLocalePayload(
  drafts: Record<AboutLocaleCode, Record<AboutPageTemplateFieldKey, string>>,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const loc of ["en", "fr"] as AboutLocaleCode[]) {
    const row: Record<string, string> = {};
    for (const key of ABOUT_PAGE_TEMPLATE_FIELD_KEYS) {
      row[key] = String(drafts[loc][key] ?? "").trim();
    }
    out[loc] = row;
  }
  return out;
}

export function AboutPageTemplateSection({
  activeLocale,
  onLocaleChange,
  drafts,
  onFieldChange,
}: Props) {
  const {t} = useUiLocale();
  const current = drafts[activeLocale] ?? emptyAboutLocaleDraft();

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">
          {t("cms.settings.aboutTemplate.title")}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {t("cms.settings.aboutTemplate.subtitle")}
        </p>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {(["en", "fr"] as AboutLocaleCode[]).map((loc) => {
          const isActive = loc === activeLocale;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => onLocaleChange(loc)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isActive ?
                  "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {loc === "en" ?
                t("cms.settings.aboutTemplate.tabEn")
              : t("cms.settings.aboutTemplate.tabFr")}
            </button>
          );
        })}
      </div>
      <div className="max-h-[min(70vh,720px)] space-y-3 overflow-y-auto pr-1">
        {ABOUT_PAGE_TEMPLATE_FIELD_KEYS.map((key) => {
          const rows = textareaRowsForAboutField(key);
          const isUrl = key === "hero_image_url";
          return (
            <label key={key} className="block text-xs text-gray-700">
              <span className="font-medium text-gray-800">
                {humanFieldLabel(key)}
              </span>
              {isUrl ?
                <input
                  type="url"
                  value={current[key]}
                  onChange={(e) => onFieldChange(activeLocale, key, e.target.value)}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              : <textarea
                  value={current[key]}
                  onChange={(e) => onFieldChange(activeLocale, key, e.target.value)}
                  rows={rows}
                  className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              }
            </label>
          );
        })}
      </div>
    </section>
  );
}
