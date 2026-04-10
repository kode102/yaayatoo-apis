"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {EditSheet} from "@/components/edit-sheet";
import {ListPageHeader} from "@/components/list-page-header";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {pickRegionalSortLabel, type ServiceDoc} from "@/lib/i18n-types";
import type {
  EmployeeDoc,
  EmployerDoc,
  JobOfferDoc,
} from "@/lib/profile-doc-types";

const col = createColumnHelper<JobOfferDoc>();

export default function JobOffersListView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const [items, setItems] = useState<JobOfferDoc[]>([]);
  const [employers, setEmployers] = useState<EmployerDoc[]>([]);
  const [employees, setEmployees] = useState<EmployeeDoc[]>([]);
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<JobOfferDoc | null>(null);
  const [draftEmployerId, setDraftEmployerId] = useState("");
  const [draftEmployeeId, setDraftEmployeeId] = useState("");
  const [draftJobTitle, setDraftJobTitle] = useState("");
  const [draftServiceId, setDraftServiceId] = useState("");

  const employerLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employers) {
      const label =
        (e.companyName ?? "").trim() ||
        e.contactName?.trim() ||
        e.id;
      m.set(e.id, label);
    }
    return m;
  }, [employers]);

  const employeeLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of employees) {
      m.set(w.id, (w.fullName ?? "").trim() || w.id);
    }
    return m;
  }, [employees]);

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

  const employersSorted = useMemo(() => {
    return [...employers].sort((a, b) => {
      const la = employerLabelById.get(a.id) ?? a.id;
      const lb = employerLabelById.get(b.id) ?? b.id;
      return la.localeCompare(lb, undefined, {sensitivity: "base"});
    });
  }, [employerLabelById, employers]);

  const servicesSorted = useMemo(() => {
    return [...services].sort((a, b) => {
      const la = serviceLabelById.get(a.id) ?? a.id;
      const lb = serviceLabelById.get(b.id) ?? b.id;
      return la.localeCompare(lb, undefined, {sensitivity: "base"});
    });
  }, [serviceLabelById, services]);

  const employeesSorted = useMemo(() => {
    return [...employees].sort((a, b) => {
      const la = employeeLabelById.get(a.id) ?? a.id;
      const lb = employeeLabelById.get(b.id) ?? b.id;
      return la.localeCompare(lb, undefined, {sensitivity: "base"});
    });
  }, [employeeLabelById, employees]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const [jobsRes, empRes, workRes, svcRes] = await Promise.all([
        adminFetch<ApiListResponse<JobOfferDoc>>(
          `/admin/documents/jobOffers?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<EmployerDoc>>(
          `/admin/documents/employer?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<EmployeeDoc>>(
          `/admin/documents/employee?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<ServiceDoc>>(
          `/admin/documents/services?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setItems((jobsRes.data ?? []) as JobOfferDoc[]);
      setEmployers((empRes.data ?? []) as EmployerDoc[]);
      setEmployees((workRes.data ?? []) as EmployeeDoc[]);
      setServices((svcRes.data ?? []) as ServiceDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeEdit = useCallback(() => {
    setEditRow(null);
  }, []);

  const openEdit = useCallback((row: JobOfferDoc) => {
    setLoadError(null);
    setEditRow(row);
    setDraftEmployerId(row.employerId ?? "");
    setDraftEmployeeId(row.employeeId ?? "");
    setDraftJobTitle(row.jobTitle ?? "");
    setDraftServiceId(row.serviceId ?? "");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    const emp = draftEmployerId.trim();
    const worker = draftEmployeeId.trim();
    const title = draftJobTitle.trim();
    const svc = draftServiceId.trim();
    if (!emp || !worker || !title || !svc) {
      setLoadError(t("jobs.form.needFields"));
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setLoadError(null);
    try {
      await adminFetch<ApiDocResponse<JobOfferDoc>>(
        `/admin/documents/jobOffers/${encodeURIComponent(editRow.id)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            employerId: emp,
            employeeId: worker,
            jobTitle: title,
            serviceId: svc,
          }),
        },
      );
      setEditRow(null);
      await load();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    draftEmployeeId,
    draftEmployerId,
    draftJobTitle,
    draftServiceId,
    editRow,
    getIdToken,
    load,
    t,
  ]);

  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("jobs.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(
          `/admin/documents/jobOffers/${encodeURIComponent(id)}`,
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

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none";

  const columns = useMemo(
    () =>
      [
        col.accessor("jobTitle", {
          id: "jobTitle",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.col.jobTitle")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="font-medium text-gray-900">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        col.accessor("employerId", {
          id: "employer",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.col.employer")}
            </SortableHeader>
          ),
          cell: ({row}) => (
            <span className="text-sm text-gray-700">
              {employerLabelById.get(row.original.employerId) ??
                row.original.employerId}
            </span>
          ),
        }),
        col.accessor("employeeId", {
          id: "employee",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.col.employee")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const id = row.original.employeeId;
            if (!id) return <span className="text-sm text-gray-400">—</span>;
            return (
              <span className="text-sm text-gray-700">
                {employeeLabelById.get(id) ?? id}
              </span>
            );
          },
        }),
        col.accessor("serviceId", {
          id: "service",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.col.service")}
            </SortableHeader>
          ),
          cell: ({row}) => (
            <span className="text-sm text-gray-700">
              {serviceLabelById.get(row.original.serviceId) ??
                row.original.serviceId}
            </span>
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
      ] as ColumnDef<JobOfferDoc, unknown>[],
    [
      busy,
      employeeLabelById,
      employerLabelById,
      openEdit,
      removeRow,
      serviceLabelById,
      t,
    ],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("jobs.list.title")}
        subtitle={t("jobs.list.subtitle")}
        createHref="/jobs/create"
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
        emptyLabel={t("jobs.list.empty")}
        minTableWidth={960}
      />
      <EditSheet
        open={!!editRow}
        title={t("jobs.editTitle")}
        onClose={closeEdit}
        panelClassName="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={closeEdit}
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
              {t("common.save")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.field.employer")}
            <select
              className={inputCls}
              value={draftEmployerId}
              onChange={(e) => setDraftEmployerId(e.target.value)}
            >
              <option value="">{t("jobs.field.employerPlaceholder")}</option>
              {employersSorted.map((e) => (
                <option key={e.id} value={e.id}>
                  {employerLabelById.get(e.id) ?? e.id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.field.employee")}
            <select
              className={inputCls}
              value={draftEmployeeId}
              onChange={(e) => setDraftEmployeeId(e.target.value)}
            >
              <option value="">{t("jobs.field.employeePlaceholder")}</option>
              {employeesSorted.map((w) => (
                <option key={w.id} value={w.id}>
                  {employeeLabelById.get(w.id) ?? w.id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.field.jobTitle")}
            <input
              type="text"
              className={inputCls}
              value={draftJobTitle}
              onChange={(e) => setDraftJobTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.field.service")}
            <select
              className={inputCls}
              value={draftServiceId}
              onChange={(e) => setDraftServiceId(e.target.value)}
            >
              <option value="">{t("jobs.field.servicePlaceholder")}</option>
              {servicesSorted.map((s) => (
                <option key={s.id} value={s.id}>
                  {serviceLabelById.get(s.id) ?? s.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      </EditSheet>
    </div>
  );
}
