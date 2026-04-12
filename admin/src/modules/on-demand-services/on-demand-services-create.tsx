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
  type OnDemandServiceDoc,
  type RegionalLocaleDrafts,
  type ServiceDoc,
} from "@/lib/i18n-types";
import {
  SERVICE_IMAGE_MAX_BYTES,
  uploadOnDemandServiceIconToStorage,
} from "@/lib/storage-upload";
import {EmployeeServicesOfferedField} from "@/components/employee-services-offered-field";

export default function OnDemandServicesCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();

  const [allServices, setAllServices] = useState<ServiceDoc[]>([]);
  const [activeCountries, setActiveCountries] = useState<CountryDoc[]>([]);
  const [draftsByCountry, setDraftsByCountry] = useState<RegionalLocaleDrafts>({});
  const [activeCountryCode, setActiveCountryCode] = useState(CMS_DEFAULT_COUNTRY_KEY);
  const [iconUrl, setIconUrl] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);
  const [activeNew, setActiveNew] = useState(true);
  const [linkedServiceIds, setLinkedServiceIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedCodes = useMemo(
    () =>
      [...activeLanguages]
        .map((l) => l.code.trim().toLowerCase())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [activeLanguages],
  );

  const sortedCountryCodes = useMemo(() => {
    const codes = activeCountries
      .filter((c) => c.active)
      .map((c) => c.code.trim().toUpperCase().slice(0, 2))
      .filter(Boolean);
    const uniq = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
    return [CMS_DEFAULT_COUNTRY_KEY, ...uniq.filter((c) => c !== CMS_DEFAULT_COUNTRY_KEY)];
  }, [activeCountries]);

  const loadData = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const [svcRes, ctRes] = await Promise.all([
        adminFetch<ApiListResponse<ServiceDoc>>(
          `/admin/documents/services?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<CountryDoc>>(
          `/admin/documents/countries?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setAllServices((svcRes.data ?? []) as ServiceDoc[]);
      setActiveCountries((ctRes.data ?? []) as CountryDoc[]);
    } catch {
      /* ignore */
    }
  }, [editorLocale, getIdToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
          if (p) fresh[c] = {...(fresh[c] ?? {}), [loc]: p};
        }
      }
      return fresh;
    });
  }, [sortedCountryCodes, sortedCodes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAnyRegionalDraftName(draftsByCountry)) {
      setLoadError(t("onDemandServices.create.errorNeedName"));
      return;
    }

    // Find first filled country/locale for the POST
    let primaryCountry = CMS_DEFAULT_COUNTRY_KEY;
    let primaryLocale = "";
    outer: for (const c of sortedCountryCodes) {
      for (const loc of sortedCodes) {
        if (draftsByCountry[c]?.[loc]?.name.trim()) {
          primaryCountry = c;
          primaryLocale = loc;
          break outer;
        }
      }
    }
    if (!primaryLocale) {
      setLoadError(t("onDemandServices.create.errorNeedName"));
      return;
    }

    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }

    setBusy(true);
    setLoadError(null);
    try {
      const primaryDraft = draftsByCountry[primaryCountry]![primaryLocale]!;

      // Create the document
      const res = await adminFetch<ApiDocResponse<OnDemandServiceDoc>>(
        "/admin/documents/onDemandServices",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            locale: primaryLocale,
            countryCode: primaryCountry,
            name: primaryDraft.name.trim(),
            labelHtml: primaryDraft.labelHtml ?? "",
            active: activeNew,
            linkedServiceIds,
          }),
        },
      );
      const id = res.data?.id;
      if (!id) throw new Error("Missing id");

      // Upload icon if provided
      if (iconFile) {
        try {
          const uploadedUrl = await uploadOnDemandServiceIconToStorage(iconFile, {
            docId: id,
          });
          await adminFetch<ApiDocResponse<OnDemandServiceDoc>>(
            `/admin/documents/onDemandServices/${id}`,
            token,
            {method: "PUT", body: JSON.stringify({iconUrl: uploadedUrl})},
          );
        } catch {
          setIconUploadError(t("errors.imageUploadFailed"));
        }
      }

      // Persist remaining country/locale translation blocks
      for (const c of sortedCountryCodes) {
        for (const loc of sortedCodes) {
          if (c === primaryCountry && loc === primaryLocale) continue;
          const d = draftsByCountry[c]?.[loc];
          if (!d?.name.trim() && !d?.labelHtml?.trim()) continue;
          await adminFetch<ApiDocResponse<OnDemandServiceDoc>>(
            `/admin/documents/onDemandServices/${id}`,
            token,
            {
              method: "PUT",
              body: JSON.stringify({
                locale: loc,
                countryCode: c,
                name: d.name.trim(),
                labelHtml: d.labelHtml ?? "",
              }),
            },
          );
        }
      }

      router.push("/services/on-demand/list");
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/services/on-demand/list"
          className="text-sm text-primary hover:underline"
        >
          {t("onDemandServices.create.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("onDemandServices.create.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("onDemandServices.create.subtitle")}
        </p>
      </div>

      {loadError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
        {/* Active */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={activeNew}
            onChange={(e) => setActiveNew(e.target.checked)}
            className="rounded border-gray-300"
          />
          {t("onDemandServices.field.active")}
        </label>

        {/* Icon upload */}
        <div className="space-y-2">
          <span className="block text-sm font-medium text-gray-700">
            {t("onDemandServices.field.iconUrl")}
          </span>
          {iconUrl && (
            <img
              src={iconUrl}
              alt=""
              className="h-16 w-16 rounded-xl object-cover border border-gray-200"
            />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setIconFile(f);
              if (f && f.size > SERVICE_IMAGE_MAX_BYTES) {
                setIconUploadError(t("errors.imageTooLarge", {maxMb: "5"}));
              } else {
                setIconUploadError(null);
                if (f) setIconUrl(URL.createObjectURL(f));
              }
            }}
            className="text-sm text-gray-600"
          />
          {iconUploadError && (
            <p className="text-xs text-red-600">{iconUploadError}</p>
          )}
        </div>

        {/* Linked Services */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {t("onDemandServices.field.linkedServicesHint")}
          </p>
          <EmployeeServicesOfferedField
            services={allServices}
            editorLocale={editorLocale}
            selectedIds={linkedServiceIds}
            onChange={setLinkedServiceIds}
          />
        </div>

        {/* Translations per country / locale */}
        <RegionalCountryLocaleEditor
          countryTabsLabel={t("cms.countryTabsLabel")}
          localesLegend={t("common.translationTabsAria")}
          defaultCountryLabel={t("cms.countryTab.default")}
          activeCountries={activeCountries}
          sortedCountryCodes={sortedCountryCodes}
          activeCountryCode={activeCountryCode}
          onCountryChange={setActiveCountryCode}
          tabFilledCountry={(cc) =>
            sortedCodes.some((loc) => {
              const d = draftsByCountry[cc]?.[loc];
              return Boolean(d?.name.trim() || d?.labelHtml?.trim());
            })
          }
          activeLanguages={activeLanguages}
          editorLocale={editorLocale}
          draftsByCountry={draftsByCountry}
          onDraftChange={(c, loc, next) =>
            setDraftsByCountry((prev) => ({
              ...prev,
              [c]: {...(prev[c] ?? {}), [loc]: next},
            }))
          }
          showDescription={false}
          showLabel={false}
          showLabelHtml={true}
          nameLabel={t("onDemandServices.field.title")}
          descriptionLabel={t("onDemandServices.field.description")}
          labelHtmlLabel={t("onDemandServices.field.description")}
        />

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("onDemandServices.create.submit")}
        </button>
      </form>
    </div>
  );
}
