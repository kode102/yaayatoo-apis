"use client";

import {serviceAvailableForCountry} from "@/lib/service-country-scope";
import type {ServiceDoc} from "@/lib/i18n-types";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  pickRegionalSortLabel,
} from "@/lib/i18n-types";
import type {EmployeeBadge} from "@/lib/profile-doc-types";
import {useUiLocale} from "@/contexts/ui-locale-context";

type Props = {
  services: ServiceDoc[];
  editorLocale: string;
  /** Pays du profil : filtre les services (hors `__` / vide = tout afficher). */
  profileCountryCode?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function EmployeeServicesOfferedField({
  services,
  editorLocale,
  profileCountryCode,
  selectedIds,
  onChange,
  disabled,
}: Props) {
  const {t} = useUiLocale();
  const set = new Set(selectedIds);
  const cc = profileCountryCode?.trim();
  const scopeCountry =
    cc && cc !== CMS_DEFAULT_COUNTRY_KEY ? cc : undefined;
  const sorted = [...services]
    .filter((s) => s.active !== false)
    .filter((s) =>
      scopeCountry ?
        serviceAvailableForCountry(s.translations, scopeCountry)
      : true,
    )
    .sort((a, b) =>
      pickRegionalSortLabel(a.translations, editorLocale, a.id).localeCompare(
        pickRegionalSortLabel(b.translations, editorLocale, b.id),
        "fr",
      ),
    );

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-gray-700">
        {t("users.employee.servicesOffered")}
      </legend>
      {scopeCountry ?
        <p className="text-xs text-gray-500">
          {t("users.employee.servicesCountryScoped")}
        </p>
      : null}
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
        {sorted.length === 0 ?
          <p className="text-sm text-gray-500">{t("users.employee.noActiveServices")}</p>
        : sorted.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300"
                checked={set.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span>
                {pickRegionalSortLabel(s.translations, editorLocale, s.id)}
              </span>
            </label>
          ))
        }
      </div>
    </fieldset>
  );
}

export const EMPLOYEE_BADGE_OPTIONS: {value: EmployeeBadge; labelKey: string}[] =
  [
    {value: "NONE", labelKey: "users.employee.badgeNone"},
    {value: "BLUE", labelKey: "users.employee.badgeBlue"},
    {value: "GREEN", labelKey: "users.employee.badgeGreen"},
    {value: "YELLOW", labelKey: "users.employee.badgeYellow"},
  ];
