"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse} from "@/lib/api";
import type {EmployerDoc} from "@/lib/profile-doc-types";

export default function EmployerCreateView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();
  const [firebaseUid, setFirebaseUid] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const uid = firebaseUid.trim();
    if (!uid) {
      setLoadError(t("users.employer.colUid") + " *");
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
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <label className="block text-sm text-gray-700">
          {t("users.employer.colUid")} *
          <input
            required
            value={firebaseUid}
            onChange={(e) => setFirebaseUid(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            placeholder="UID Auth Firebase"
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
          {t("users.employer.colNotes")}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {t("users.employer.create.submit")}
        </button>
      </form>
    </div>
  );
}
