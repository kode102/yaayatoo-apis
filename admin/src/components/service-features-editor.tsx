"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {ServiceLabelHtmlEditor} from "@/components/service-label-html-editor";
import {CMS_DEFAULT_COUNTRY_KEY, type ServiceFeatureItem} from "@/lib/i18n-types";

type Props = {
  items: ServiceFeatureItem[];
  onChange: (items: ServiceFeatureItem[]) => void;
  disabled?: boolean;
};

/**
 * Éditeur de liste de « Features » : chaque élément est un bloc HTML TinyMCE
 * traduit par pays et par langue. Un onglet langue par langue active.
 */
export function ServiceFeaturesEditor({items, onChange, disabled}: Props) {
  const {t} = useUiLocale();
  const {activeLanguages} = useEditorLocale();

  function addItem() {
    onChange([...items, {}]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function updateItemHtml(index: number, locale: string, html: string) {
    const next = items.map((item, i) => {
      if (i !== index) return item;
      const country = CMS_DEFAULT_COUNTRY_KEY;
      return {
        ...item,
        [country]: {
          ...(item[country] ?? {}),
          [locale]: {
            ...((item[country] ?? {})[locale] ?? {}),
            labelHtml: html,
          },
        },
      };
    });
    onChange(next);
  }

  function getItemHtml(item: ServiceFeatureItem, locale: string): string {
    return (
      (item[CMS_DEFAULT_COUNTRY_KEY]?.[locale]?.labelHtml as string | undefined)
        ?.trim() ?? ""
    );
  }

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-semibold text-gray-700">
        {t("services.features.sectionTitle")}
      </legend>
      <p className="text-xs text-gray-500">{t("services.features.hint")}</p>

      {items.map((item, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              {t("services.features.itemLabel", {n: String(idx + 1)})}
            </span>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              {t("services.features.removeItem")}
            </button>
          </div>

          {/* One TinyMCE per active locale */}
          {activeLanguages.length === 0 ? (
            <p className="text-xs text-amber-600">
              {t("common.translationTabsNoLanguages")}
            </p>
          ) : (
            activeLanguages.map((lang) => {
              const locale = lang.code.trim().toLowerCase();
              return (
                <div key={locale} className="space-y-1">
                  <span className="block text-xs text-gray-500">
                    {t("services.features.htmlLabel", {locale})}
                  </span>
                  <ServiceLabelHtmlEditor
                    value={getItemHtml(item, locale)}
                    onChange={(html) => updateItemHtml(idx, locale, html)}
                    disabled={disabled}
                  />
                </div>
              );
            })
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        className="w-full rounded-lg border-2 border-dashed border-gray-200 py-2 text-sm text-gray-500 hover:border-primary/50 hover:text-primary disabled:opacity-50"
      >
        {t("services.features.addItem")}
      </button>
    </fieldset>
  );
}
