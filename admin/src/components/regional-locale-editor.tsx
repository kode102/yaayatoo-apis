"use client";

import {TranslationLocaleTabs} from "@/components/translation-locale-tabs";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  type CountryDoc,
  labelForLocale,
  pickSortLabel,
  type LanguageDoc,
  type LocaleTextDraft,
  type RegionalLocaleDrafts,
} from "@/lib/i18n-types";

type Props = {
  countryTabsLabel: string;
  localesLegend: string;
  defaultCountryLabel: string;
  activeCountries: CountryDoc[];
  sortedCountryCodes: string[];
  activeCountryCode: string;
  onCountryChange: (cc: string) => void;
  tabFilledCountry: (cc: string) => boolean;
  activeLanguages: LanguageDoc[];
  editorLocale: string;
  draftsByCountry: RegionalLocaleDrafts;
  onDraftChange: (country: string, locale: string, next: LocaleTextDraft) => void;
  showDescription: boolean;
  showLabel?: boolean;
  /** Éditeur HTML par langue (services). */
  showLabelHtml?: boolean;
  nameLabel: string;
  descriptionLabel: string;
  labelLabel?: string;
  labelHtmlLabel?: string;
};

function countryTabLabel(
  cc: string,
  defaultLabel: string,
  activeCountries: CountryDoc[],
  editorLocale: string,
): string {
  if (cc === CMS_DEFAULT_COUNTRY_KEY) return defaultLabel;
  const doc = activeCountries.find(
    (x) => x.code.trim().toUpperCase().slice(0, 2) === cc,
  );
  const name =
    labelForLocale(doc?.translations, editorLocale) ||
    pickSortLabel(doc?.translations, editorLocale, cc);
  return name ? `${cc} — ${name}` : cc;
}

export function RegionalCountryLocaleEditor({
  countryTabsLabel,
  localesLegend,
  defaultCountryLabel,
  activeCountries,
  sortedCountryCodes,
  activeCountryCode,
  onCountryChange,
  tabFilledCountry,
  activeLanguages,
  editorLocale,
  draftsByCountry,
  onDraftChange,
  showDescription,
  showLabel = false,
  showLabelHtml = false,
  nameLabel,
  descriptionLabel,
  labelLabel = "",
  labelHtmlLabel = "",
}: Props) {
  const draftsForCountry =
    draftsByCountry[activeCountryCode] ??
    ({} as Record<string, LocaleTextDraft>);

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-gray-600">{countryTabsLabel}</p>
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {sortedCountryCodes.map((cc) => {
          const selected = cc === activeCountryCode;
          return (
            <button
              key={cc}
              type="button"
              onClick={() => onCountryChange(cc)}
              className={`max-w-full truncate rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                selected ?
                  "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${tabFilledCountry(cc) ? "ring-1 ring-inset ring-emerald-300/80" : ""}`}
              title={cc}
            >
              {countryTabLabel(cc, defaultCountryLabel, activeCountries, editorLocale)}
            </button>
          );
        })}
      </div>
      <p className="text-xs font-medium text-gray-600">{localesLegend}</p>
      <TranslationLocaleTabs
        activeLanguages={activeLanguages}
        editorLocale={editorLocale}
        drafts={draftsForCountry}
        showDescription={showDescription}
        showLabel={showLabel}
        showLabelHtml={showLabelHtml}
        nameLabel={nameLabel}
        descriptionLabel={descriptionLabel}
        labelLabel={labelLabel}
        labelHtmlLabel={labelHtmlLabel}
        onDraftChange={(code, next) =>
          onDraftChange(activeCountryCode, code, next)
        }
      />
    </div>
  );
}
