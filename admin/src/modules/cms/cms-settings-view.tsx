"use client";

import {useCallback, useEffect, useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  type CmsSettingsDoc,
  type CmsSettingsRegion,
  type CountryDoc,
} from "@/lib/i18n-types";
import {
  defaultAboutDraftsByLocale,
  type AboutLocaleCode,
  type AboutPageTemplateFieldKey,
} from "./about-page-template-fields";
import {
  AboutPageTemplateSection,
  buildAboutPageByLocalePayload,
  mergeAboutDraftsFromDoc,
} from "./about-page-template-section";

type SettingsDraft = {
  googlePlayStoreLink: string;
  appleAppStoreLink: string;
  facebookLink: string;
  twitterXLink: string;
  instagramLink: string;
  linkedInLink: string;
  tiktokLink: string;
  youtubeLink: string;
  whatsappLink: string;
  addresses: string[];
  phoneNumbers: string[];
  emailAddresses: string[];
};

function toDraftRegion(region?: CmsSettingsRegion): SettingsDraft {
  return {
    googlePlayStoreLink: region?.googlePlayStoreLink ?? "",
    appleAppStoreLink: region?.appleAppStoreLink ?? "",
    facebookLink: region?.facebookLink ?? "",
    twitterXLink: region?.twitterXLink ?? "",
    instagramLink: region?.instagramLink ?? "",
    linkedInLink: region?.linkedInLink ?? "",
    tiktokLink: region?.tiktokLink ?? "",
    youtubeLink: region?.youtubeLink ?? "",
    whatsappLink: region?.whatsappLink ?? "",
    addresses: region?.addresses?.length ? region.addresses : [""],
    phoneNumbers: region?.phoneNumbers?.length ? region.phoneNumbers : [""],
    emailAddresses: region?.emailAddresses?.length ? region.emailAddresses : [""],
  };
}

function readPerCountry(
  doc?: CmsSettingsDoc,
): Record<string, CmsSettingsRegion> {
  if (doc?.perCountry && typeof doc.perCountry === "object") {
    return doc.perCountry;
  }
  return {
    [CMS_DEFAULT_COUNTRY_KEY]: {
      googlePlayStoreLink: doc?.googlePlayStoreLink ?? "",
      appleAppStoreLink: doc?.appleAppStoreLink ?? "",
      facebookLink: doc?.facebookLink ?? "",
      twitterXLink: doc?.twitterXLink ?? "",
      instagramLink: doc?.instagramLink ?? "",
      linkedInLink: doc?.linkedInLink ?? "",
      tiktokLink: doc?.tiktokLink ?? "",
      youtubeLink: doc?.youtubeLink ?? "",
      whatsappLink: doc?.whatsappLink ?? "",
      addresses: doc?.addresses ?? [],
      phoneNumbers: doc?.phoneNumbers ?? [],
      emailAddresses: doc?.emailAddresses ?? [],
    },
  };
}

type StringListFieldsetProps = {
  label: string;
  addLabel: string;
  placeholder: string;
  type: "text" | "tel" | "email";
  values: string[];
  onChange: (next: string[]) => void;
};

function StringListFieldset({
  label,
  addLabel,
  placeholder,
  type,
  values,
  onChange,
}: StringListFieldsetProps) {
  function updateValue(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  function removeValue(index: number) {
    if (values.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
      <legend className="px-0.5 text-sm font-medium text-gray-800">{label}</legend>
      {values.map((value, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type={type}
            value={value}
            onChange={(e) => updateValue(idx, e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeValue(idx)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm leading-none text-gray-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Remove row"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="rounded-lg border border-dashed border-primary/40 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

export default function CmsSettingsView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [draftsByCountry, setDraftsByCountry] = useState<
    Record<string, SettingsDraft>
  >({});
  const [countryCodes, setCountryCodes] = useState<string[]>([
    CMS_DEFAULT_COUNTRY_KEY,
  ]);
  const [activeCountryCode, setActiveCountryCode] = useState(
    CMS_DEFAULT_COUNTRY_KEY,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aboutDrafts, setAboutDrafts] = useState(() =>
    defaultAboutDraftsByLocale(),
  );
  const [activeAboutLocale, setActiveAboutLocale] =
    useState<AboutLocaleCode>("en");

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoading(false);
      setError(t("errors.session"));
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const [settingsRes, countriesRes] = await Promise.all([
        adminFetch<ApiListResponse<CmsSettingsDoc>>(
          "/admin/documents/cmsSettings",
          token,
        ),
        adminFetch<ApiListResponse<CountryDoc>>(
          "/admin/documents/countries",
          token,
        ),
      ]);
      const first = (settingsRes.data ?? [])[0];
      const countries = (countriesRes.data ?? []) as CountryDoc[];
      const dynamicCountryCodes = countries
        .filter((c) => c.active !== false)
        .map((c) => String(c.code ?? "").trim().toUpperCase().slice(0, 2))
        .filter(Boolean);
      const nextCountryCodes = [
        CMS_DEFAULT_COUNTRY_KEY,
        ...new Set(dynamicCountryCodes),
      ];
      const byCountry = readPerCountry(first);
      const nextDrafts: Record<string, SettingsDraft> = {};
      for (const cc of nextCountryCodes) {
        nextDrafts[cc] = toDraftRegion(byCountry[cc]);
      }
      setSettingsId(first?.id ?? null);
      setCountryCodes(nextCountryCodes);
      setDraftsByCountry(nextDrafts);
      setAboutDrafts(mergeAboutDraftsFromDoc(first?.aboutPageByLocale));
      setActiveCountryCode((prev) =>
        nextCountryCodes.includes(prev) ? prev : CMS_DEFAULT_COUNTRY_KEY,
      );
    } catch {
      setError(t("cms.settings.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentDraft = draftsByCountry[activeCountryCode] ?? toDraftRegion();

  function patchDraft(next: Partial<SettingsDraft>) {
    setDraftsByCountry((prev) => ({
      ...prev,
      [activeCountryCode]: {
        ...(prev[activeCountryCode] ?? toDraftRegion()),
        ...next,
      },
    }));
  }

  async function save() {
    const token = await getIdToken();
    if (!token) {
      setError(t("errors.session"));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const draft = currentDraft;
    const payload = {
      ...draft,
      countryCode: activeCountryCode,
      addresses: draft.addresses.map((x) => x.trim()).filter(Boolean),
      phoneNumbers: draft.phoneNumbers.map((x) => x.trim()).filter(Boolean),
      emailAddresses: draft.emailAddresses.map((x) => x.trim()).filter(Boolean),
      aboutPageByLocale: buildAboutPageByLocalePayload(aboutDrafts),
    };
    try {
      if (!settingsId) {
        const created = await adminFetch<ApiDocResponse<CmsSettingsDoc>>(
          "/admin/documents/cmsSettings",
          token,
          {method: "POST", body: JSON.stringify(payload)},
        );
        setSettingsId(created.data?.id ?? null);
      } else {
        await adminFetch<ApiDocResponse<CmsSettingsDoc>>(
          `/admin/documents/cmsSettings/${settingsId}`,
          token,
          {method: "PUT", body: JSON.stringify(payload)},
        );
      }
      setSuccess(t("cms.settings.saveSuccess"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t("cms.settings.title")}</h1>
        <p className="text-sm text-gray-500">{t("cms.settings.subtitle")}</p>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {countryCodes.map((cc) => {
          const isActive = cc === activeCountryCode;
          return (
            <button
              key={cc}
              type="button"
              onClick={() => setActiveCountryCode(cc)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isActive ?
                  "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cc === CMS_DEFAULT_COUNTRY_KEY ? "DEFAULT" : cc}
            </button>
          );
        })}
      </div>

      {error ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      : null}
      {success ?
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      : null}

      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold text-gray-900">
          {t("cms.settings.storeLinks")}
        </h2>
        <label className="block text-sm text-gray-700">
          {t("cms.settings.googlePlayStoreLink")}
          <input
            type="url"
            value={currentDraft.googlePlayStoreLink}
            onChange={(e) =>
              patchDraft({googlePlayStoreLink: e.target.value})
            }
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-gray-700">
          {t("cms.settings.appleAppStoreLink")}
          <input
            type="url"
            value={currentDraft.appleAppStoreLink}
            onChange={(e) =>
              patchDraft({appleAppStoreLink: e.target.value})
            }
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold text-gray-900">
          {t("cms.settings.socialMediaLinks")}
        </h2>
        {([
          ["facebookLink", "cms.settings.facebookLink"],
          ["twitterXLink", "cms.settings.twitterXLink"],
          ["instagramLink", "cms.settings.instagramLink"],
          ["linkedInLink", "cms.settings.linkedInLink"],
          ["tiktokLink", "cms.settings.tiktokLink"],
          ["youtubeLink", "cms.settings.youtubeLink"],
          ["whatsappLink", "cms.settings.whatsappLink"],
        ] as const).map(([key, labelKey]) => (
          <label key={key} className="block text-sm text-gray-700">
            {t(labelKey)}
            <input
              type="url"
              value={currentDraft[key]}
              onChange={(e) =>
                patchDraft({[key]: e.target.value} as Partial<SettingsDraft>)
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <StringListFieldset
          label={t("cms.settings.addresses")}
          addLabel={t("cms.settings.addAddress")}
          placeholder={t("cms.settings.addressPlaceholder")}
          type="text"
          values={currentDraft.addresses}
          onChange={(next) => patchDraft({addresses: next})}
        />
        <StringListFieldset
          label={t("cms.settings.phoneNumbers")}
          addLabel={t("cms.settings.addPhone")}
          placeholder={t("cms.settings.phonePlaceholder")}
          type="tel"
          values={currentDraft.phoneNumbers}
          onChange={(next) => patchDraft({phoneNumbers: next})}
        />
        <StringListFieldset
          label={t("cms.settings.emailAddresses")}
          addLabel={t("cms.settings.addEmail")}
          placeholder={t("cms.settings.emailPlaceholder")}
          type="email"
          values={currentDraft.emailAddresses}
          onChange={(next) => patchDraft({emailAddresses: next})}
        />
      </section>

      <AboutPageTemplateSection
        activeLocale={activeAboutLocale}
        onLocaleChange={setActiveAboutLocale}
        drafts={aboutDrafts}
        onFieldChange={(
          loc: AboutLocaleCode,
          key: AboutPageTemplateFieldKey,
          value: string,
        ) => {
          setAboutDrafts((prev) => ({
            ...prev,
            [loc]: {...prev[loc], [key]: value},
          }));
        }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
