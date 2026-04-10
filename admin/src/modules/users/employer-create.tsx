"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {EmployerProfileImageField} from "@/components/employer-profile-image-field";
import {ProfileWizardStepIndicator} from "@/components/profile-form-wizard";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse} from "@/lib/api";
import {yearsOfExperienceFromStartDate} from "@/lib/employee-display";
import {EMPLOYER_BADGE_OPTIONS} from "@/lib/employer-badge-options";
import type {EmployerBadge, EmployerDoc} from "@/lib/profile-doc-types";

export default function EmployerCreateView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [firebaseUid, setFirebaseUid] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [badge, setBadge] = useState<EmployerBadge>("NONE");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [occupation, setOccupation] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tenurePreview = yearsOfExperienceFromStartDate(joinedAt);

  function goNext() {
    if (step === 0 && !firebaseUid.trim()) {
      setLoadError(t("users.employer.create.needUid"));
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
      setLoadError(t("users.employer.create.needUid"));
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
      await adminFetch<ApiDocResponse<EmployerDoc>>(
        "/admin/documents/employer",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            firebaseUid: uid,
            companyName: companyName.trim(),
            contactName: contactName.trim(),
            notes,
            joinedAt: joinedAt.trim() || undefined,
            badge,
            profileImageUrl: profileImageUrl.trim(),
            occupation: occupation.trim(),
          }),
        },
      );
      router.push("/users/employer/list");
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
          href="/users/employer/list"
          className="text-sm text-primary hover:text-primary-hover"
        >
          {t("users.employer.create.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("users.employer.create.title")}
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
                {t("users.employer.colUid")} *
                <input
                  value={firebaseUid}
                  onChange={(e) => setFirebaseUid(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                  placeholder="UID Auth Firebase"
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employer.colCompany")}
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employer.colContact")}
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("users.employer.occupation")}
                <input
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
            </>
          : step === 1 ?
            <>
              <label className="block text-sm text-gray-700">
                {t("users.employer.joinedAt")}
                <input
                  type="date"
                  value={joinedAt}
                  onChange={(e) => setJoinedAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </label>
              {tenurePreview !== null ?
                <p className="text-sm text-gray-600">
                  {t("users.employer.memberYears", {
                    years: String(tenurePreview),
                  })}
                </p>
              : null}
              <label className="block text-sm text-gray-700">
                {t("users.employer.badge")}
                <select
                  value={badge}
                  onChange={(e) =>
                    setBadge(e.target.value as EmployerBadge)
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
                value={profileImageUrl}
                onChange={setProfileImageUrl}
                employerUid={firebaseUid.trim() || undefined}
                disabled={busy}
              />
            </>
          : <>
              <label className="block text-sm text-gray-700">
                {t("users.employer.colNotes")}
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
                {t("users.employer.create.submit")}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
