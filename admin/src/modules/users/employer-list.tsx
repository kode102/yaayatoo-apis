"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {CountryCodeSelect} from "@/components/country-code-select";
import {EmployerProfileImageField} from "@/components/employer-profile-image-field";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {EditSheet} from "@/components/edit-sheet";
import {ProfileWizardStepIndicator} from "@/components/profile-form-wizard";
import {ListPageHeader} from "@/components/list-page-header";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {useDuplicateRow} from "@/lib/use-duplicate-row";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {yearsOfExperienceFromStartDate} from "@/lib/employee-display";
import type {CountryDoc} from "@/lib/i18n-types";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  pickSortLabel,
} from "@/lib/i18n-types";
import {EMPLOYER_BADGE_OPTIONS} from "@/lib/employer-badge-options";
import type {EmployerBadge, EmployerDoc} from "@/lib/profile-doc-types";

const col = createColumnHelper<EmployerDoc>();

function employerBadgeClass(b: EmployerBadge | undefined): string {
  if (b === "TRUSTED") return "bg-emerald-100 text-emerald-900";
  return "bg-gray-100 text-gray-600";
}

export default function EmployerListView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const [items, setItems] = useState<EmployerDoc[]>([]);
  const [countries, setCountries] = useState<CountryDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<EmployerDoc | null>(null);
  const [editStep, setEditStep] = useState(0);
  const [draftCompany, setDraftCompany] = useState("");
  const [draftContact, setDraftContact] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftJoined, setDraftJoined] = useState("");
  const [draftBadge, setDraftBadge] = useState<EmployerBadge>("NONE");
  const [draftImage, setDraftImage] = useState("");
  const [draftOccupation, setDraftOccupation] = useState("");
  const [draftCountryCode, setDraftCountryCode] = useState("");

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
      const [empRes, cRes] = await Promise.all([
        adminFetch<ApiListResponse<EmployerDoc>>(
          `/admin/documents/employer?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<CountryDoc>>(
          `/admin/documents/countries?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setItems((empRes.data ?? []) as EmployerDoc[]);
      setCountries((cRes.data ?? []) as CountryDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeEdit = useCallback(() => {
    setEditRow(null);
    setEditStep(0);
  }, []);

  const openEdit = useCallback((row: EmployerDoc) => {
    setEditStep(0);
    setEditRow(row);
    setDraftCompany(row.companyName ?? "");
    setDraftContact(row.contactName ?? "");
    setDraftNotes(row.notes ?? "");
    setDraftJoined(row.joinedAt ?? "");
    setDraftBadge(row.badge ?? "NONE");
    setDraftImage(row.profileImageUrl ?? "");
    setDraftOccupation(row.occupation ?? "");
    const rawCc = row.countryCode?.trim().toUpperCase() ?? "";
    setDraftCountryCode(
      rawCc && rawCc !== CMS_DEFAULT_COUNTRY_KEY ? rawCc : "",
    );
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    if (!draftCountryCode.trim()) {
      setLoadError(t("users.employer.edit.needCountry"));
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminFetch<ApiDocResponse<EmployerDoc>>(
        `/admin/documents/employer/${encodeURIComponent(editRow.id)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            companyName: draftCompany.trim(),
            contactName: draftContact.trim(),
            notes: draftNotes,
            joinedAt: draftJoined.trim(),
            badge: draftBadge,
            countryCode: draftCountryCode,
            profileImageUrl: draftImage.trim(),
            occupation: draftOccupation.trim(),
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
    draftCompany,
    draftContact,
    draftCountryCode,
    draftImage,
    draftJoined,
    draftNotes,
    draftOccupation,
    editRow,
    getIdToken,
    load,
    t,
  ]);

  const toggleEmployerActive = useCallback(
    async (row: EmployerDoc) => {
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch<ApiDocResponse<EmployerDoc>>(
          `/admin/documents/employer/${encodeURIComponent(row.id)}`,
          token,
          {method: "PUT", body: JSON.stringify({active: row.active === false})},
        );
        await load();
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load],
  );

    const {duplicateRow, duplicating} = useDuplicateRow("employer", load);
  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("users.employer.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(`/admin/documents/employer/${encodeURIComponent(id)}`, token, {
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

  const tenureEdit = yearsOfExperienceFromStartDate(draftJoined);

  const columns = useMemo(
    () =>
      [
        col.display({
          id: "photo",
          enableSorting: false,
          enableGlobalFilter: false,
          header: () => (
            <span className="font-medium">{t("users.employer.profileImage")}</span>
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
        col.accessor("companyName", {
          id: "company",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employer.colEmployerName")}
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
              {t("users.employer.colCountry")}
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
        col.accessor("occupation", {
          id: "occupation",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employer.occupation")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="text-sm text-gray-700">{info.getValue() ?? "—"}</span>
          ),
        }),
        col.accessor("badge", {
          id: "badge",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employer.colBadge")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const b = row.original.badge ?? "NONE";
            const opt = EMPLOYER_BADGE_OPTIONS.find((x) => x.value === b);
            return (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${employerBadgeClass(b)}`}
              >
                {opt ? t(opt.labelKey) : b}
              </span>
            );
          },
        }),
        col.accessor("joinedAt", {
          id: "joined",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employer.colMemberSince")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const y = yearsOfExperienceFromStartDate(row.original.joinedAt);
            if (y === null) return <span className="text-gray-400">—</span>;
            return (
              <span className="text-sm text-gray-700">
                {t("users.employer.memberYears", {years: String(y)})}
              </span>
            );
          },
        }),
        col.accessor("contactName", {
          id: "contact",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employer.colContact")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="text-sm text-gray-700">{info.getValue() ?? "—"}</span>
          ),
        }),
        col.accessor("firebaseUid", {
          id: "uid",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.employer.colUid")}
            </SortableHeader>
          ),
          cell: (info) => (
            <code className="text-xs text-gray-600 break-all">
              {info.getValue()}
            </code>
          ),
        }),
        col.accessor(
          (row) => (row.active === false ? 0 : 1),
          {
            id: "active",
            header: ({column}) => (
              <SortableHeader column={column}>{t("common.active")}</SortableHeader>
            ),
            cell: ({row}) => (
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleEmployerActive(row.original)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  row.original.active === false ?
                    "bg-gray-100 text-gray-500"
                  : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {row.original.active === false ? t("common.no") : t("common.yes")}
              </button>
            ),
            sortingFn: (a, b) =>
              Number(a.original.active !== false) -
              Number(b.original.active !== false),
          },
        ),
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
                label={t("common.duplicate")}
                disabled={busy || duplicating}
                onClick={() => void duplicateRow(row.original.id)}
                className="text-sky-600 hover:bg-sky-50"
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
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
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
      ] as ColumnDef<EmployerDoc, unknown>[],
    [busy, countryLabelByCode, openEdit, removeRow, t, toggleEmployerActive],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("users.employer.list.title")}
        subtitle={t("users.employer.list.subtitle")}
        createHref="/users/employer/create"
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
        emptyLabel={t("users.employer.list.empty")}
        minTableWidth={1180}
        persistColumnVisibilityKey="employer"
      />
      <EditSheet
        open={!!editRow}
        title={t("users.employer.editTitle")}
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
                      setLoadError(t("users.employer.edit.needCountry"));
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
                {t("users.employer.colEmployerName")}
                <input
                  value={draftCompany}
                  onChange={(e) => setDraftCompany(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employer.colContact")}
                <input
                  value={draftContact}
                  onChange={(e) => setDraftContact(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employer.occupation")}
                <input
                  value={draftOccupation}
                  onChange={(e) => setDraftOccupation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employer.colCountry")} *
                <CountryCodeSelect
                  countries={countries}
                  editorLocale={editorLocale}
                  value={draftCountryCode}
                  onChange={setDraftCountryCode}
                  disabled={busy}
                />
              </label>
            </>
          : editStep === 1 ?
            <>
              <label className="block text-sm text-gray-700">
                {t("users.employer.joinedAt")}
                <input
                  type="date"
                  value={draftJoined}
                  onChange={(e) => setDraftJoined(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              {tenureEdit !== null ?
                <p className="text-sm text-gray-600">
                  {t("users.employer.memberYears", {
                    years: String(tenureEdit),
                  })}
                </p>
              : null}
              <label className="block text-sm text-gray-700">
                {t("users.employer.badge")}
                <select
                  value={draftBadge}
                  onChange={(e) =>
                    setDraftBadge(e.target.value as EmployerBadge)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                >
                  {EMPLOYER_BADGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <EmployerProfileImageField
                value={draftImage}
                onChange={setDraftImage}
                employerUid={editRow?.firebaseUid}
                disabled={busy}
              />
            </>
          : <label className="block text-sm text-gray-700">
              {t("users.employer.colNotes")}
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
