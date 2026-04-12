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
  hasAnyRegionalDraftName,
  localeFilledCountRegional,
  mergeRegionalDraftsFromTranslations,
  type OnDemandServiceDoc,
  pickRegionalSortLabel,
  sortedActiveLanguageCodes,
  type RegionalLocaleDrafts,
  type ServiceDoc,
} from "@/lib/i18n-types";
import {
  SERVICE_IMAGE_MAX_BYTES,
  uploadOnDemandServiceIconToStorage,
} from "@/lib/storage-upload";
import {EmployeeServicesOfferedField} from "@/components/employee-services-offered-field";

const col = createColumnHelper<OnDemandServiceDoc>();

export default function OnDemandServicesListView() {
  const {getIdToken} = useAuth();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const {t} = useUiLocale();

  const [items, setItems] = useState<OnDemandServiceDoc[]>([]);
  const [allServices, setAllServices] = useState<ServiceDoc[]>([]);
  const [activeCountries, setActiveCountries] = useState<CountryDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editRow, setEditRow] = useState<OnDemandServiceDoc | null>(null);
  const [editDraftsByCountry, setEditDraftsByCountry] =
    useState<RegionalLocaleDrafts>({});
  const [editCountryCode, setEditCountryCode] = useState(
    CMS_DEFAULT_COUNTRY_KEY,
  );
  const [editIconUrl, setEditIconUrl] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editLinkedServiceIds, setEditLinkedServiceIds] = useState<string[]>(
    [],
  );
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);

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
      const [odRes, svcRes, ctRes] = await Promise.all([
        adminFetch<ApiListResponse<OnDemandServiceDoc>>(
          `/admin/documents/onDemandServices?sortLocale=${encodeURIComponent(
            editorLocale,
          )}`,
          token,
        ),
        adminFetch<ApiListResponse<ServiceDoc>>(
          `/admin/documents/services?sortLocale=${encodeURIComponent(
            editorLocale,
          )}`,
          token,
        ),
        adminFetch<ApiListResponse<CountryDoc>>(
          `/admin/documents/countries?sortLocale=${encodeURIComponent(
            editorLocale,
          )}`,
          token,
        ),
      ]);
      setItems((odRes.data ?? []) as OnDemandServiceDoc[]);
      setAllServices((svcRes.data ?? []) as ServiceDoc[]);
      setActiveCountries((ctRes.data ?? []) as CountryDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditCountryCode((prev) =>
      sortedCountryCodes.includes(prev) ? prev : CMS_DEFAULT_COUNTRY_KEY,
    );
  }, [sortedCountryCodes]);

  const openEdit = useCallback(
    (row: OnDemandServiceDoc) => {
      setEditRow(row);
      setEditActive(row.active !== false);
      setEditIconUrl(row.iconUrl ?? "");
      setEditLinkedServiceIds(row.linkedServiceIds ?? []);
      setIconFile(null);
      setIconUploadError(null);
      setEditCountryCode(CMS_DEFAULT_COUNTRY_KEY);
      setEditDraftsByCountry(
        mergeRegionalDraftsFromTranslations(
          row.translations,
          sortedCountryCodes,
          sortedCodes,
        ),
      );
    },
    [sortedCountryCodes, sortedCodes],
  );

  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("onDemandServices.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(
          `/admin/documents/onDemandServices/${id}`,
          token,
          {method: "DELETE"},
        );
        await load();
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load, t],
  );

  function tabFilledCountry(cc: string): boolean {
    return sortedCodes.some((loc) => {
      const d = editDraftsByCountry[cc]?.[loc];
      return Boolean(d?.name.trim() || d?.labelHtml?.trim());
    });
  }

  async function saveEdit() {
    if (!editRow) return;
    if (!hasAnyRegionalDraftName(editDraftsByCountry)) {
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
      let finalIconUrl = editIconUrl;
      if (iconFile) {
        try {
          finalIconUrl = await uploadOnDemandServiceIconToStorage(iconFile, {
            docId: editRow.id,
          });
          setEditIconUrl(finalIconUrl);
          setIconFile(null);
        } catch {
          setIconUploadError(t("errors.imageUploadFailed"));
          setBusy(false);
          return;
        }
      }

      await adminFetch<ApiDocResponse<OnDemandServiceDoc>>(
        `/admin/documents/onDemandServices/${editRow.id}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            iconUrl: finalIconUrl,
            active: editActive,
            linkedServiceIds: editLinkedServiceIds,
          }),
        },
      );

      for (const c of sortedCountryCodes) {
        for (const loc of sortedCodes) {
          const d = editDraftsByCountry[c]?.[loc];
          if (!d) continue;
          if (!d.name.trim() && !d.labelHtml?.trim()) continue;
          await adminFetch<ApiDocResponse<OnDemandServiceDoc>>(
            `/admin/documents/onDemandServices/${editRow.id}`,
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

      await load();
      setEditRow(null);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo<ColumnDef<OnDemandServiceDoc, unknown>[]>(
    () => [
      col.accessor(
        (row) =>
          pickRegionalSortLabel(row.translations, editorLocale, row.id),
        {
          id: "title",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("onDemandServices.list.colTitle")}
            </SortableHeader>
          ),
          cell: ({getValue}) => (
            <span className="font-medium">{String(getValue())}</span>
          ),
        },
      ),
      col.accessor("iconUrl", {
        header: t("onDemandServices.list.colIcon"),
        enableSorting: false,
        cell: ({getValue}) => {
          const url = getValue() as string | undefined;
          return url ?
            <img
              src={url}
              alt=""
              className="h-8 w-8 rounded-md object-cover border border-gray-200"
            />
          : <span className="text-gray-400 text-xs">—</span>;
        },
      }),
      col.accessor(
        (row) => (row.linkedServiceIds ?? []).length,
        {
          id: "linkedCount",
          header: t("onDemandServices.list.colLinkedServices"),
          cell: ({getValue}) => (
            <span className="text-sm text-gray-600">{String(getValue())}</span>
          ),
        },
      ),
      col.accessor("active", {
        header: t("common.active"),
        cell: ({getValue}) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              getValue() ?
                "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
            }`}
          >
            {getValue() ? t("common.yes") : t("common.no")}
          </span>
        ),
      }),
      col.accessor(
        (row) => localeFilledCountRegional(row.translations),
        {
          id: "locales",
          header: t("common.locales"),
          cell: ({getValue}) => (
            <span className="text-sm text-gray-500">{String(getValue())}</span>
          ),
        },
      ),
      col.display({
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
    ],
    [busy, editorLocale, openEdit, removeRow, t],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("onDemandServices.list.title")}
        subtitle={t("onDemandServices.list.subtitle")}
        createHref="/services/on-demand/create"
      />

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <AdminDataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        emptyLabel={t("onDemandServices.list.title")}
        persistColumnVisibilityKey="onDemandServices"
      />

      <EditSheet
        open={!!editRow}
        title={t("onDemandServices.edit.sheetTitle")}
        onClose={() => setEditRow(null)}
        scrollableContent
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
              disabled={busy}
              onClick={() => void saveEdit()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Active */}
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t("onDemandServices.field.active")}
          </label>

          {/* Icon upload */}
          <div className="space-y-1">
            <span className="block text-sm font-medium text-gray-700">
              {t("onDemandServices.field.iconUrl")}
            </span>
            {editIconUrl && (
              <img
                src={editIconUrl}
                alt=""
                className="mb-2 h-16 w-16 rounded-xl object-cover border border-gray-200"
              />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setIconFile(f);
                if (f && f.size > SERVICE_IMAGE_MAX_BYTES) {
                  setIconUploadError(
                    t("errors.imageTooLarge", {maxMb: "5"}),
                  );
                } else {
                  setIconUploadError(null);
                }
              }}
              className="text-sm text-gray-600"
            />
            {iconUploadError && (
              <p className="text-xs text-red-600">{iconUploadError}</p>
            )}
          </div>

          {/* Linked Services */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              {t("onDemandServices.field.linkedServicesHint")}
            </p>
            <EmployeeServicesOfferedField
              services={allServices}
              editorLocale={editorLocale}
              selectedIds={editLinkedServiceIds}
              onChange={setEditLinkedServiceIds}
            />
          </div>

          {/* Translations */}
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
            onDraftChange={(c, loc, next) =>
              setEditDraftsByCountry((prev) => ({
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
        </div>
      </EditSheet>
    </div>
  );
}
