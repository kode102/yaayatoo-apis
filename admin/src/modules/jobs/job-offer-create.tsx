"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useMemo, useState} from "react";
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

export default function JobOfferCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();
  const [employers, setEmployers] = useState<EmployerDoc[]>([]);
  const [employees, setEmployees] = useState<EmployeeDoc[]>([]);
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const label = (w.fullName ?? "").trim() || w.id;
      m.set(w.id, label);
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

  const loadRefs = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const [empRes, workRes, svcRes] = await Promise.all([
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
      setEmployers((empRes.data ?? []) as EmployerDoc[]);
      setEmployees((workRes.data ?? []) as EmployeeDoc[]);
      setServices((svcRes.data ?? []) as ServiceDoc[]);
    } catch {
      setEmployers([]);
      setEmployees([]);
      setServices([]);
    }
  }, [editorLocale, getIdToken]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emp = employerId.trim();
    const worker = employeeId.trim();
    const title = jobTitle.trim();
    const svc = serviceId.trim();
    if (!emp || !worker || !title || !svc) {
      setLoadError(t("jobs.form.needFields"));
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
      await adminFetch<ApiDocResponse<JobOfferDoc>>(
        "/admin/documents/jobOffers",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            employerId: emp,
            employeeId: worker,
            jobTitle: title,
            serviceId: svc,
          }),
        },
      );
      router.push("/jobs/list");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/jobs/list"
          className="text-sm text-primary hover:text-primary-hover"
        >
          {t("jobs.create.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("jobs.create.title")}
        </h1>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          {t("jobs.field.employer")}
          <select
            required
            className={inputCls}
            value={employerId}
            onChange={(e) => setEmployerId(e.target.value)}
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
            required
            className={inputCls}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
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
            required
            type="text"
            className={inputCls}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t("jobs.field.service")}
          <select
            required
            className={inputCls}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">{t("jobs.field.servicePlaceholder")}</option>
            {servicesSorted.map((s) => (
              <option key={s.id} value={s.id}>
                {serviceLabelById.get(s.id) ?? s.id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
        >
          {t("jobs.create.submit")}
        </button>
      </form>
    </div>
  );
}
