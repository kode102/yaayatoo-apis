"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {CountryCodeSelect} from "@/components/country-code-select";
import {EmployeeProfileImageField} from "@/components/employee-profile-image-field";
import {
  EMPLOYEE_BADGE_OPTIONS,
  EmployeeServicesOfferedField,
} from "@/components/employee-services-offered-field";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {EditSheet} from "@/components/edit-sheet";
import {ProfileWizardStepIndicator} from "@/components/profile-form-wizard";
import {ListPageHeader} from "@/components/list-page-header";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {yearsOfExperienceFromStartDate} from "@/lib/employee-display";
import {
  EMPLOYEE_STATUS_OPTIONS,
  employeeStatusOrDefault,
} from "@/lib/employee-status-options";
import type {CountryDoc, ServiceDoc} from "@/lib/i18n-types";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  pickRegionalSortLabel,
  pickSortLabel,
} from "@/lib/i18n-types";
import {serviceAvailableForCountry} from "@/lib/service-country-scope";
import type {
  EmployeeBadge,
  EmployeeDoc,
  EmployeeStatus,
} from "@/lib/profile-doc-types";

const col = createColumnHelper<EmployeeDoc>();

function statusPillClass(s: EmployeeStatus): string {
  switch (s) {
    case "FREE":
      return "bg-emerald-100 text-emerald-900";
    case "BUSY":
      return "bg-amber-100 text-amber-900";
    case "BLOCKED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function badgePillClass(b: EmployeeBadge | undefined): string {
  switch (b) {
    case "BLUE":
      return "bg-blue-100 text-blue-800";
    case "GREEN":
      return "bg-emerald-100 text-emerald-800";
    case "YELLOW":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function EmployeeListView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const [items, setItems] = useState<EmployeeDoc[]>([]);
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [countries, setCountries] = useState<CountryDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<EmployeeDoc | null>(null);
  const [editStep, setEditStep] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftStarted, setDraftStarted] = useState("");
  const [draftDateOfBirth, setDraftDateOfBirth] = useState("");
  const [draftBadge, setDraftBadge] = useState<EmployeeBadge>("NONE");
  const [draftStatus, setDraftStatus] = useState<EmployeeStatus>("FREE");
  const [draftImage, setDraftImage] = useState("");
  const [draftServiceIds, setDraftServiceIds] = useState<string[]>([]);
  const [draftCountryCode, setDraftCountryCode] = useState("");
  const prevDraftCountryRef = useRef<string | undefined>(undefined);

  const serviceLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of services) {
      m.set(
        s.id,
        pickRegionalSortLabel(s.translations, editorLocale, s.id),
      );
    }
    return m;
  }, [editorLocale, services]);

  const countryLabelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of countries) {
      const code = c.code.trim().toUpperCase().slice(0, 2);
      m.set(
        code,
        pickSortLabel(c.translations, editorLocale, c.code),
      );
    }
    return m;
  }, [countries, editorLocale]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const [empRes, svcRes, cRes] = await Promise.all([
        adminFetch<ApiListResponse<EmployeeDoc>>(
          `/admin/documents/employee?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<ServiceDoc>>(
          `/admin/documents/services?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<CountryDoc>>(
          `/admin/documents/countries?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setItems((empRes.data ?? []) as EmployeeDoc[]);
      setServices((svcRes.data ?? []) as ServiceDoc[]);
      setCountries((cRes.data ?? []) as CountryDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!editRow) return;
    if (!draftCountryCode) {
      prevDraftCountryRef.current = draftCountryCode;
      return;
    }
    if (prevDraftCountryRef.current === undefined) {
      prevDraftCountryRef.current = draftCountryCode;
      return;
    }
    if (prevDraftCountryRef.current === draftCountryCode) return;
    prevDraftCountryRef.current = draftCountryCode;
    setDraftServiceIds((prev) =>
      prev.filter((id) => {
        const s = services.find((x) => x.id === id);
        return (
          !!s && serviceAvailableForCountry(s.translations, draftCountryCode)
        );
      }),
    );
  }, [draftCountryCode, services, editRow]);

  const closeEdit = useCallback(() => {
    setEditRow(null);
    setEditStep(0);
    prevDraftCountryRef.current = undefined;
  }, []);

  const openEdit = useCallback((row: EmployeeDoc) => {
    prevDraftCountryRef.current = undefined;
    setEditStep(0);
    setEditRow(row);
    setDraftName(row.fullName ?? "");
    setDraftNotes(row.notes ?? "");
    setDraftStarted(row.startedWorkingAt ?? "");
    setDraftDateOfBirth(row.dateOfBirth ?? "");
    setDraftBadge(row.badge ?? "NONE");
    setDraftStatus(employeeStatusOrDefault(row.status));
    setDraftImage(row.profileImageUrl ?? "");
    setDraftServiceIds(
      Array.isArray(row.offeredServiceIds) ? [...row.offeredServiceIds] : [],
    );
    const rawCc = row.countryCode?.trim().toUpperCase() ?? "";
    setDraftCountryCode(
      rawCc && rawCc !== CMS_DEFAULT_COUNTRY_KEY ? rawCc : "",
    );
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    if (!draftCountryCode.trim()) {
      setLoadError(t("users.employee.edit.needCountry"));
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminFetch<ApiDocResponse<EmployeeDoc>>(
        `/admin/documents/employee/${encodeURIComponent(editRow.id)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            fullName: draftName.trim(),
            notes: draftNotes,
            startedWorkingAt: draftStarted.trim(),
            dateOfBirth: draftDateOfBirth.trim(),
            badge: draftBadge,
            status: draftStatus,
            countryCode: draftCountryCode,
            profileImageUrl: draftImage.trim(),
            offeredServiceIds: draftServiceIds,
          }),
        },
      );
      setEditRow(null);
      setEditStep(0);
      await load();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    draftBadge,
    draftStatus,
    draftCountryCode,
    draftImage,
    draftName,
    draftNotes,
    draftServiceIds,
    draftStarted,
    draftDateOfBirth,
    editRow,
    getIdToken,
    load,
    t,
  ]);

  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("users.employee.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(`/admin/documents/employee/${encodeURIComponent(id)}`, token, {
          method: "DELETE",
        });
        await load();
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load, t],
  );

  const expPreviewEdit = yearsOfExperienceFromStartDate(draftStarted);
  const agePreviewEdit = yearsOfExperienceFromStartDate(draftDateOfBirth);

  const columns = useMemo(
    () =>
      [
        col.display({
          id: "photo",
          enableSorting: false,
          enableGlobalFilter: false,
          header: () => (
            <span className="font-medium">{t("users.employee.profileImage")}</span>
          ),
          cell: ({row}) =>
            row.original.profileImageUrl ?
              /* eslint-disable-next-line @next/next/no-img-element -- URL Storage */
              <img
                src={row.original.profileImageUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-md border border-gray-200 object-cover"
              />
            : <span className="text-gray-400">—</span>,
        }),
        col.accessor("fullName", {
          id: "fullName",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employee.colName")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="font-medium">{info.getValue() ?? "—"}</span>
          ),
        }),
        col.accessor("countryCode", {
          id: "country",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employee.colCountry")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const cc = row.original.countryCode?.trim().toUpperCase() ?? "";
            if (!cc || cc === CMS_DEFAULT_COUNTRY_KEY) {
              return (
                <span className="text-xs text-gray-400">
                  {t("users.profile.countryLegacy")}
                </span>
              );
            }
            return (
              <span className="text-sm text-gray-700">
                {countryLabelByCode.get(cc) ?? cc}
              </span>
            );
          },
        }),
        col.accessor((row) => employeeStatusOrDefault(row.status), {
          id: "status",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employee.colStatus")}
            </SortableHeader>
          ),
          cell: (info) => {
            const s = info.getValue();
            const opt = EMPLOYEE_STATUS_OPTIONS.find((x) => x.value === s);
            return (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusPillClass(s)}`}
              >
                {opt ? t(opt.labelKey) : s}
              </span>
            );
          },
        }),
        col.accessor("badge", {
          id: "badge",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employee.colBadge")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const b = row.original.badge ?? "NONE";
            const opt = EMPLOYEE_BADGE_OPTIONS.find((x) => x.value === b);
            return (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgePillClass(b)}`}
              >
                {opt ? t(opt.labelKey) : b}
              </span>
            );
          },
        }),
        col.accessor("startedWorkingAt", {
          id: "exp",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employee.colExperience")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const y = yearsOfExperienceFromStartDate(row.original.startedWorkingAt);
            if (y === null) return <span className="text-gray-400">—</span>;
            return (
              <span className="text-sm text-gray-700">
                {t("users.employee.experienceYears", {years: String(y)})}
              </span>
            );
          },
        }),
        col.accessor("dateOfBirth", {
          id: "dob",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employee.colDateOfBirth")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const raw = row.original.dateOfBirth?.trim();
            if (!raw) return <span className="text-gray-400">—</span>;
            const age = yearsOfExperienceFromStartDate(raw);
            return (
              <span className="text-sm text-gray-700">
                {raw}
                {age !== null ?
                  <span className="ml-1 text-xs text-gray-500">
                    ({t("users.employee.ageYearsShort", {years: String(age)})})
                  </span>
                : null}
              </span>
            );
          },
        }),
        col.display({
          id: "services",
          enableSorting: false,
          header: () => (
            <span className="font-medium">{t("users.employee.colServices")}</span>
          ),
          cell: ({row}) => {
            const ids = row.original.offeredServiceIds ?? [];
            if (ids.length === 0) return <span className="text-gray-400">—</span>;
            const labels = ids
              .map((id) => serviceLabelById.get(id) ?? id)
              .filter(Boolean);
            const text =
              labels.length > 2 ?
                `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`
              : labels.join(", ");
            return (
              <span className="max-w-[200px] truncate text-sm text-gray-600" title={labels.join(", ")}>
                {text}
              </span>
            );
          },
        }),
        col.accessor("firebaseUid", {
          id: "uid",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employee.colUid")}
            </SortableHeader>
          ),
          cell: (info) => (
            <code className="text-xs text-gray-600 break-all">
              {info.getValue()}
            </code>
          ),
        }),
        col.display({
          id: "actions",
          enableSorting: false,
          enableGlobalFilter: false,
          header: () => <span className="font-medium" />,
          cell: ({row}) => (
            <div className="inline-flex items-center justify-end gap-1">
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
      ] as ColumnDef<EmployeeDoc, unknown>[],
    [busy, countryLabelByCode, openEdit, removeRow, serviceLabelById, t],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("users.employee.list.title")}
        subtitle={t("users.employee.list.subtitle")}
        createHref="/users/employee/create"
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
        emptyLabel={t("users.employee.list.empty")}
        minTableWidth={1280}
      />
      <EditSheet
        open={!!editRow}
        title={t("users.employee.editTitle")}
        onClose={closeEdit}
        panelClassName="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={closeEdit}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              {editStep > 0 ?
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditStep((s) => Math.max(0, s - 1))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("users.wizard.back")}
                </button>
              : null}
              {editStep < 2 ?
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (editStep === 0 && !draftCountryCode.trim()) {
                      setLoadError(t("users.employee.edit.needCountry"));
                      return;
                    }
                    setLoadError(null);
                    setEditStep((s) => Math.min(2, s + 1));
                  }}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {t("users.wizard.next")}
                </button>
              : <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveEdit()}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
              }
            </div>
          </>
        }
      >
        <ProfileWizardStepIndicator currentStep={editStep} />
        <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto pr-1">
          <p className="text-xs text-gray-500">
            UID :{" "}
            <code className="text-gray-800">{editRow?.firebaseUid}</code>
          </p>
          {editStep === 0 ?
            <>
              <label className="block text-sm text-gray-700">
                {t("users.employee.colName")}
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employee.colCountry")} *
                <CountryCodeSelect
                  countries={countries}
                  editorLocale={editorLocale}
                  value={draftCountryCode}
                  onChange={setDraftCountryCode}
                  disabled={busy}
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employee.colStatus")}
                <select
                  value={draftStatus}
                  onChange={(e) =>
                    setDraftStatus(e.target.value as EmployeeStatus)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                >
                  {EMPLOYEE_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          : editStep === 1 ?
            <>
              <label className="block text-sm text-gray-700">
                {t("users.employee.startedWorkingAt")}
                <input
                  type="date"
                  value={draftStarted}
                  onChange={(e) => setDraftStarted(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              {expPreviewEdit !== null ?
                <p className="text-sm text-gray-600">
                  {t("users.employee.experienceYears", {
                    years: String(expPreviewEdit),
                  })}
                </p>
              : null}
              <label className="block text-sm text-gray-700">
                {t("users.employee.dateOfBirth")}
                <input
                  type="date"
                  value={draftDateOfBirth}
                  onChange={(e) => setDraftDateOfBirth(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              {agePreviewEdit !== null ?
                <p className="text-sm text-gray-600">
                  {t("users.employee.agePreview", {
                    years: String(agePreviewEdit),
                  })}
                </p>
              : null}
              <label className="block text-sm text-gray-700">
                {t("users.employee.badge")}
                <select
                  value={draftBadge}
                  onChange={(e) =>
                    setDraftBadge(e.target.value as EmployeeBadge)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                >
                  {EMPLOYEE_BADGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <EmployeeProfileImageField
                value={draftImage}
                onChange={setDraftImage}
                employeeUid={editRow?.firebaseUid}
                disabled={busy}
              />
              <EmployeeServicesOfferedField
                services={services}
                editorLocale={editorLocale}
                profileCountryCode={draftCountryCode}
                selectedIds={draftServiceIds}
                onChange={setDraftServiceIds}
                disabled={busy}
              />
            </>
          : <label className="block text-sm text-gray-700">
              {t("users.employee.colNotes")}
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
              />
            </label>
          }
        </div>
      </EditSheet>
    </div>
  );
}
