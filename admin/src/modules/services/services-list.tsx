"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {ListPageHeader} from "@/components/list-page-header";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {EditSheet} from "@/components/edit-sheet";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {RegionalCountryLocaleEditor} from "@/components/regional-locale-editor";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  type CountryDoc,
  getCmsLocaleBlock,
  hasAnyRegionalDraftName,
  localeFilledCountRegional,
  mergeRegionalDraftsFromTranslations,
  pickRegionalSortLabel,
  sortedActiveLanguageCodes,
  type CmsTranslationsByCountry,
  type RegionalLocaleDrafts,
  type ServiceDoc,
} from "@/lib/i18n-types";
import {persistServiceEditDrafts} from "@/lib/translation-persist";
import {
  emptyServiceMarketingDraft,
  serviceMarketingDraftFromDoc,
  serviceMarketingDraftToApiPatch,
  type ServiceMarketingDraft,
} from "@/lib/service-marketing";
import {uiLocaleFromEditorCode} from "@/lib/ui-locale-constants";
import {ServiceImageUploadField} from "@/components/service-image-upload-field";
import {ServiceMarketingEditor} from "@/components/service-marketing-editor";

const serviceColumnHelper = createColumnHelper<ServiceDoc>();

export default function ServicesListView() {
  const {getIdToken} = useAuth();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const {t, locale: uiLocale} = useUiLocale();
  const [items, setItems] = useState<ServiceDoc[]>([]);
  const [activeCountries, setActiveCountries] = useState<CountryDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<ServiceDoc | null>(null);
  const [editDraftsByCountry, setEditDraftsByCountry] =
    useState<RegionalLocaleDrafts>({});
  const [editCountryCode, setEditCountryCode] = useState(
    CMS_DEFAULT_COUNTRY_KEY,
  );
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editMarketing, setEditMarketing] = useState<ServiceMarketingDraft>(
    emptyServiceMarketingDraft,
  );

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

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const [svcRes, cRes] = await Promise.all([
        adminFetch<ApiListResponse<ServiceDoc>>(
          `/admin/documents/services?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<CountryDoc>>(
          `/admin/documents/countries?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setItems((svcRes.data ?? []) as ServiceDoc[]);
      setActiveCountries((cRes.data ?? []) as CountryDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [getIdToken, editorLocale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditCountryCode((prev) =>
      sortedCountryCodes.includes(prev) ? prev : CMS_DEFAULT_COUNTRY_KEY,
    );
  }, [sortedCountryCodes]);

  const toggleActive = useCallback(
    async (row: ServiceDoc) => {
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch<ApiDocResponse<ServiceDoc>>(
          `/admin/documents/services/${row.id}`,
          token,
          {method: "PUT", body: JSON.stringify({active: !row.active})},
        );
        await load();
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load],
  );

  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("services.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(`/admin/documents/services/${id}`, token, {
          method: "DELETE",
        });
        await load();
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load, t],
  );

  const openEdit = useCallback(
    (row: ServiceDoc) => {
      setEditRow(row);
      setEditDraftsByCountry(
        mergeRegionalDraftsFromTranslations(
          row.translations,
          sortedCountryCodes,
          sortedCodes,
        ),
      );
      setEditImageUrl(row.imageUrl ?? "");
      setEditMarketing(serviceMarketingDraftFromDoc(row));
    },
    [sortedCountryCodes, sortedCodes],
  );

  function tabFilledCountry(cc: string): boolean {
    return sortedCodes.some((loc) => {
      const d = editDraftsByCountry[cc]?.[loc];
      if (!d) return false;
      if (d.name.trim()) return true;
      return d.description.trim().length > 0;
    });
  }

  async function saveEdit() {
    if (!editRow) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await persistServiceEditDrafts(
        token,
        editRow.id,
        sortedCountryCodes,
        sortedCodes,
        editDraftsByCountry,
        editImageUrl,
        serviceMarketingDraftToApiPatch(editMarketing),
      );
      setEditRow(null);
      await load();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const dateLocale =
    uiLocaleFromEditorCode(uiLocale) === "en" ? "en-GB" : "fr-FR";

  const columns = useMemo(
    () =>
      [
      serviceColumnHelper.accessor(
        (row) => pickRegionalSortLabel(row.translations, editorLocale, row.id),
        {
          id: "name",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("services.list.colName", {locale: editorLocale})}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="font-medium">{String(info.getValue() ?? "")}</span>
          ),
        },
      ),
      serviceColumnHelper.accessor(
        (row) =>
          getCmsLocaleBlock(
            row.translations as CmsTranslationsByCountry,
            CMS_DEFAULT_COUNTRY_KEY,
            editorLocale,
          )?.description ?? "",
        {
          id: "description",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("services.list.colDesc")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="max-w-xs truncate text-gray-500">
              {String(info.getValue() ?? "")}
            </span>
          ),
        },
      ),
      serviceColumnHelper.display({
        id: "image",
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => (
          <span className="font-medium">{t("services.list.colImage")}</span>
        ),
        cell: ({row}) =>
          row.original.imageUrl ?
            <a
              href={row.original.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 transition-opacity hover:opacity-80"
              title={t("services.list.openImage")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL dynamique */}
              <img
                src={row.original.imageUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-md object-cover"
                loading="lazy"
              />
            </a>
          : <span className="text-gray-400">—</span>,
      }),
      serviceColumnHelper.accessor(
        (row) => localeFilledCountRegional(row.translations),
        {
          id: "locales",
          header: ({column}) => (
            <SortableHeader column={column}>{t("common.locales")}</SortableHeader>
          ),
          cell: (info) => (
            <span className="text-gray-500">{String(info.getValue() ?? "")}</span>
          ),
        },
      ),
      serviceColumnHelper.accessor("active", {
        header: ({column}) => (
          <SortableHeader column={column}>{t("common.active")}</SortableHeader>
        ),
        cell: ({row}) => (
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleActive(row.original)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
              row.original.active ?
                "bg-emerald-100 text-emerald-800"
              : "bg-gray-100 text-gray-500"
            }`}
          >
            {row.original.active ? t("common.yes") : t("common.no")}
          </button>
        ),
        sortingFn: (a, b) =>
          Number(a.original.active) - Number(b.original.active),
      }),
      serviceColumnHelper.accessor(
        (row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : 0),
        {
          id: "updatedAt",
          header: ({column}) => (
            <SortableHeader column={column}>{t("common.updated")}</SortableHeader>
          ),
          cell: ({row}) => (
            <span className="text-xs text-gray-500">
              {row.original.updatedAt ?
                new Date(row.original.updatedAt).toLocaleString(dateLocale)
              : "—"}
            </span>
          ),
        },
      ),
      serviceColumnHelper.display({
        id: "actions",
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => <span className="font-medium" />,
        cell: ({row}) => (
          <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
            <RippleIconButton
              label={t("common.edit")}
              disabled={busy}
              onClick={() => openEdit(row.original)}
              className="text-primary hover:bg-primary/12"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-[18px] w-[18px]"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
            </RippleIconButton>
            <RippleIconButton
              label={t("common.delete")}
              disabled={busy}
              onClick={() => void removeRow(row.original.id)}
              className="text-red-600 hover:bg-red-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-[18px] w-[18px]"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </RippleIconButton>
          </div>
        ),
      }),
    ] as ColumnDef<ServiceDoc, unknown>[],
    [
      busy,
      dateLocale,
      editorLocale,
      openEdit,
      removeRow,
      t,
      toggleActive,
    ],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("services.list.title")}
        subtitle={t("services.list.subtitle")}
        createHref="/services/create"
      />
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <AdminDataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        emptyLabel={t("services.list.empty")}
        minTableWidth={800}
        persistColumnVisibilityKey="services"
      />
      <EditSheet
        open={!!editRow}
        title={t("services.edit.sheetTitle")}
        onClose={() => setEditRow(null)}
        scrollableContent
        panelClassName="max-w-5xl w-full"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditRow(null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy || !hasAnyRegionalDraftName(editDraftsByCountry)}
              onClick={() => void saveEdit()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </>
        }
      >
        <RegionalCountryLocaleEditor
          countryTabsLabel={t("cms.countryTabsLabel")}
          localesLegend={t("common.locales")}
          defaultCountryLabel={t("cms.countryTab.default")}
          activeCountries={activeCountries}
          sortedCountryCodes={sortedCountryCodes}
          activeCountryCode={editCountryCode}
          onCountryChange={setEditCountryCode}
          tabFilledCountry={tabFilledCountry}
          activeLanguages={activeLanguages}
          editorLocale={editorLocale}
          draftsByCountry={editDraftsByCountry}
          onDraftChange={(country, locale, next) =>
            setEditDraftsByCountry((p) => ({
              ...p,
              [country]: {...(p[country] ?? {}), [locale]: next},
            }))
          }
          showDescription
          nameLabel={t("common.name")}
          descriptionLabel={t("common.description")}
        />
        {editRow ?
          <>
            <ServiceImageUploadField
              value={editImageUrl}
              onChange={setEditImageUrl}
              serviceId={editRow.id}
              disabled={busy}
            />
            <ServiceMarketingEditor
              serviceId={editRow.id}
              disabled={busy}
              value={editMarketing}
              onChange={setEditMarketing}
            />
          </>
        : null}
      </EditSheet>
    </div>
  );
}
