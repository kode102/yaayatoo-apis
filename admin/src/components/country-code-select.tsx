"use client";

import type {CountryDoc} from "@/lib/i18n-types";
import {pickSortLabel} from "@/lib/i18n-types";
import {useUiLocale} from "@/contexts/ui-locale-context";

type Props = {
  countries: CountryDoc[];
  editorLocale: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
};

export function CountryCodeSelect({
  countries,
  editorLocale,
  value,
  onChange,
  disabled,
}: Props) {
  const {t} = useUiLocale();
  const sorted = [...countries]
    .filter((c) => c.active !== false)
    .sort((a, b) =>
      pickSortLabel(a.translations, editorLocale, a.code).localeCompare(
        pickSortLabel(b.translations, editorLocale, b.code),
        "fr",
      ),
    );

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none disabled:opacity-50"
    >
      <option value="">{t("users.profile.countrySelectPlaceholder")}</option>
      {sorted.map((c) => {
        const code = c.code.trim().toUpperCase().slice(0, 2);
        return (
          <option key={c.id} value={code}>
            {pickSortLabel(c.translations, editorLocale, c.code)} ({code})
          </option>
        );
      })}
    </select>
  );
}
