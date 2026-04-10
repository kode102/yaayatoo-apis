"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {EmployeeProfileImageField} from "@/components/employee-profile-image-field";
import {FirebaseUidSearchSelect} from "@/components/firebase-uid-search-select";
import {
  EMPLOYEE_BADGE_OPTIONS,
  EmployeeServicesOfferedField,
} from "@/components/employee-services-offered-field";
import {ProfileWizardStepIndicator} from "@/components/profile-form-wizard";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {EMPLOYEE_STATUS_OPTIONS} from "@/lib/employee-status-options";
import {yearsOfExperienceFromStartDate} from "@/lib/employee-display";
import type {ServiceDoc} from "@/lib/i18n-types";
import type {
  EmployeeBadge,
  EmployeeDoc,
  EmployeeStatus,
} from "@/lib/profile-doc-types";

export default function EmployeeCreateView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const {editorLocale} = useEditorLocale();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [firebaseUid, setFirebaseUid] = useState("");
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");
  const [startedWorkingAt, setStartedWorkingAt] = useState("");
  const [badge, setBadge] = useState<EmployeeBadge>("NONE");
  const [status, setStatus] = useState<EmployeeStatus>("FREE");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [offeredServiceIds, setOfferedServiceIds] = useState<string[]>([]);
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadServices = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await adminFetch<ApiListResponse<ServiceDoc>>(
        `/admin/documents/services?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setServices((res.data ?? []) as ServiceDoc[]);
    } catch {
      setServices([]);
    }
  }, [editorLocale, getIdToken]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const expPreview = yearsOfExperienceFromStartDate(startedWorkingAt);

  function goNext() {
    if (step === 0 && !firebaseUid.trim()) {
      setLoadError(t("users.employee.create.needUid"));
      return;
    }
    setLoadError(null);
    setStep((s) => Math.min(s + 1, 2));
  }

  function goBack() {
    setLoadError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function doCreate() {
    const uid = firebaseUid.trim();
    if (!uid) {
      setLoadError(t("users.employee.create.needUid"));
      setStep(0);
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
      await adminFetch<ApiDocResponse<EmployeeDoc>>(
        "/admin/documents/employee",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            firebaseUid: uid,
            fullName: fullName.trim(),
            notes,
            startedWorkingAt: startedWorkingAt.trim() || undefined,
            badge,
            status,
            profileImageUrl: profileImageUrl.trim(),
            offeredServiceIds,
          }),
        },
      );
      router.push("/users/employee/list");
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
          href="/users/employee/list"
          className="text-sm text-primary hover:text-primary-hover"
        >
          {t("users.employee.create.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("users.employee.create.title")}
        </h1>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <ProfileWizardStepIndicator currentStep={step} />
        <div className="min-h-[180px] space-y-4">
          {step === 0 ?
            <>
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
                {t("users.profile.dualRoleHint")}
              </p>
              <label className="block text-sm text-gray-700">
                {t("users.employee.colUid")} *
                <FirebaseUidSearchSelect
                  value={firebaseUid}
                  onChange={setFirebaseUid}
                  disabled={busy}
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employee.colName")}
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employee.colStatus")}
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as EmployeeStatus)
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
          : step === 1 ?
            <>
              <label className="block text-sm text-gray-700">
                {t("users.employee.startedWorkingAt")}
                <input
                  type="date"
                  value={startedWorkingAt}
                  onChange={(e) => setStartedWorkingAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              {expPreview !== null ?
                <p className="text-sm text-gray-600">
                  {t("users.employee.experienceYears", {
                    years: String(expPreview),
                  })}
                </p>
              : null}
              <label className="block text-sm text-gray-700">
                {t("users.employee.badge")}
                <select
                  value={badge}
                  onChange={(e) =>
                    setBadge(e.target.value as EmployeeBadge)
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
                value={profileImageUrl}
                onChange={setProfileImageUrl}
                employeeUid={firebaseUid.trim() || undefined}
                disabled={busy}
              />
              <EmployeeServicesOfferedField
                services={services}
                editorLocale={editorLocale}
                selectedIds={offeredServiceIds}
                onChange={setOfferedServiceIds}
                disabled={busy}
              />
            </>
          : <>
              <label className="block text-sm text-gray-700">
                {t("users.employee.colNotes")}
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
            </>
          }
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
          {step > 0 ?
            <button
              type="button"
              onClick={goBack}
              disabled={busy}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t("users.wizard.back")}
            </button>
          : <span />}
          <div className="flex gap-2">
            {step < 2 ?
              <button
                type="button"
                onClick={goNext}
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {t("users.wizard.next")}
              </button>
            : <button
                type="button"
                disabled={busy}
                onClick={() => void doCreate()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {t("users.employee.create.submit")}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
