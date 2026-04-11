"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {RegionalCountryLocaleEditor} from "@/components/regional-locale-editor";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  type CountryDoc,
  hasAnyRegionalDraftName,
  mergeRegionalDraftsFromTranslations,
  sortedActiveLanguageCodes,
  type RegionalLocaleDrafts,
  type ServiceDoc,
} from "@/lib/i18n-types";
import {ServiceImageUploadField} from "@/components/service-image-upload-field";
import {ServiceMarketingEditor} from "@/components/service-marketing-editor";
import {
  emptyServiceMarketingDraft,
  serviceMarketingDraftToApiPatch,
  type ServiceMarketingDraft,
} from "@/lib/service-marketing";

export default function ServicesCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();
  const [activeCountries, setActiveCountries] = useState<CountryDoc[]>([]);
  const [draftsByCountry, setDraftsByCountry] = useState<RegionalLocaleDrafts>(
    {},
  );
  const [activeCountryCode, setActiveCountryCode] = useState(
    CMS_DEFAULT_COUNTRY_KEY,
  );
  const [imageUrl, setImageUrl] = useState("");
  const [createMarketing, setCreateMarketing] = useState<ServiceMarketingDraft>(
    emptyServiceMarketingDraft,
  );
  const [activeNew, setActiveNew] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedCodes = useMemo(
    () => sortedActiveLanguageCodes(activeLanguages),
    [activeLanguages],
  );

  const sortedCountryCodes = useMemo(() => {
    const codes = activeCountries
      .filter((c) => c.active)
      .map((c) => c.code.trim().toUpperCase().slice(0, 2))
      .filter(Boolean);
    const uniq = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
    return [
      CMS_DEFAULT_COUNTRY_KEY,
      ...uniq.filter((c) => c !== CMS_DEFAULT_COUNTRY_KEY),
    ];
  }, [activeCountries]);

  const loadCountries = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await adminFetch<ApiListResponse<CountryDoc>>(
        `/admin/documents/countries?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setActiveCountries((res.data ?? []) as CountryDoc[]);
    } catch {
      /* ignore */
    }
  }, [editorLocale, getIdToken]);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    setActiveCountryCode((prev) =>
      sortedCountryCodes.includes(prev) ? prev : CMS_DEFAULT_COUNTRY_KEY,
    );
  }, [sortedCountryCodes]);

  useEffect(() => {
    setDraftsByCountry((prev) => {
      const fresh = mergeRegionalDraftsFromTranslations(
        undefined,
        sortedCountryCodes,
        sortedCodes,
      );
      for (const c of sortedCountryCodes) {
        for (const loc of sortedCodes) {
          const p = prev[c]?.[loc];
          if (p) {
            fresh[c] = {...(fresh[c] ?? {}), [loc]: p};
          }
        }
      }
      return fresh;
    });
  }, [sortedCountryCodes, sortedCodes]);

  function tabFilledCountry(cc: string): boolean {
    return sortedCodes.some((loc) => {
      const d = draftsByCountry[cc]?.[loc];
      if (!d) return false;
      if (d.name.trim()) return true;
      return d.description.trim().length > 0;
    });
  }

  async function createRow(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAnyRegionalDraftName(draftsByCountry)) {
      setLoadError(t("common.translationTabsHint"));
      return;
    }
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    let primaryCountry = CMS_DEFAULT_COUNTRY_KEY;
    let primaryLocale = "";
    outer:
      for (const c of sortedCountryCodes) {
        for (const loc of sortedCodes) {
          const n = draftsByCountry[c]?.[loc]?.name.trim();
          if (n) {
            primaryCountry = c;
            primaryLocale = loc;
            break outer;
          }
        }
      }
    if (!primaryLocale) {
      setLoadError(t("services.create.errorNeedName"));
      return;
    }

    setBusy(true);
    setLoadError(null);
    try {
      const primaryDraft = draftsByCountry[primaryCountry]![primaryLocale]!;
      const marketingBody = serviceMarketingDraftToApiPatch(createMarketing);
      const res = await adminFetch<ApiDocResponse<ServiceDoc>>(
        "/admin/documents/services",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            locale: primaryLocale,
            countryCode: primaryCountry,
            name: primaryDraft.name.trim(),
            description: primaryDraft.description ?? "",
            imageUrl,
            active: activeNew,
            ...marketingBody,
          }),
        },
      );
      const id = res.data?.id;
      if (!id) throw new Error("Missing id");

      for (const c of sortedCountryCodes) {
        for (const loc of sortedCodes) {
          if (c === primaryCountry && loc === primaryLocale) continue;
          const d = draftsByCountry[c]?.[loc];
          if (!d) continue;
          const name = d.name.trim();
          const desc = d.description;
          if (!name && !desc.trim()) continue;
          const body: Record<string, unknown> = {
            locale: loc,
            countryCode: c,
          };
          if (name) body.name = name;
          body.description = desc;
          await adminFetch<ApiDocResponse<ServiceDoc>>(
            `/admin/documents/services/${id}`,
            token,
            {method: "PUT", body: JSON.stringify(body)},
          );
        }
      }

      setDraftsByCountry({});
      setImageUrl("");
      setCreateMarketing(emptyServiceMarketingDraft());
      setActiveNew(true);
      router.push("/services/list");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("services.create.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("services.create.subtitleTabs")}
        </p>
      </div>
      <Link
        href="/services/list"
        className="inline-block text-sm font-medium text-primary hover:text-secondary"
      >
        {t("services.create.back")}
      </Link>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form
        onSubmit={(e) => void createRow(e)}
        className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <RegionalCountryLocaleEditor
          countryTabsLabel={t("cms.countryTabsLabel")}
          localesLegend={t("common.locales")}
          defaultCountryLabel={t("cms.countryTab.default")}
          activeCountries={activeCountries}
          sortedCountryCodes={sortedCountryCodes}
          activeCountryCode={activeCountryCode}
          onCountryChange={setActiveCountryCode}
          tabFilledCountry={tabFilledCountry}
          activeLanguages={activeLanguages}
          editorLocale={editorLocale}
          draftsByCountry={draftsByCountry}
          onDraftChange={(country, locale, next) =>
            setDraftsByCountry((p) => ({
              ...p,
              [country]: {...(p[country] ?? {}), [locale]: next},
            }))
          }
          showDescription
          nameLabel={t("common.name")}
          descriptionLabel={t("common.description")}
        />
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            id="svc-active"
            checked={activeNew}
            onChange={(e) => setActiveNew(e.target.checked)}
          />
          <label htmlFor="svc-active">{t("common.active")}</label>
        </div>
        <ServiceImageUploadField
          value={imageUrl}
          onChange={setImageUrl}
          disabled={busy}
        />
        <ServiceMarketingEditor
          disabled={busy}
          value={createMarketing}
          onChange={setCreateMarketing}
        />
        <button
          type="submit"
          disabled={busy || !hasAnyRegionalDraftName(draftsByCountry)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("services.create.submit")}
        </button>
      </form>
    </div>
  );
}
