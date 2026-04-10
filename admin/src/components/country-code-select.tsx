"use client";

import {useMemo} from "react";
import type {CountryDoc} from "@/lib/i18n-types";
import {pickSortLabel} from "@/lib/i18n-types";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {SearchableRelationSelect} from "@/components/searchable-relation-select";

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

  const options = useMemo(
    () =>
      sorted.map((c) => {
        const code = c.code.trim().toUpperCase().slice(0, 2);
        return {
          value: code,
          label: pickSortLabel(c.translations, editorLocale, c.code),
          hint: code,
        };
      }),
    [sorted, editorLocale],
  );

  return (
    <SearchableRelationSelect
      value={value}
      onChange={onChange}
      options={options}
      emptyOptionLabel={t("users.profile.countrySelectPlaceholder")}
      disabled={disabled}
    />
  );
}
