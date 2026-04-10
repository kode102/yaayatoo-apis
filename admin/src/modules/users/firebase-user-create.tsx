"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch} from "@/lib/api";
import type {ApiFirebaseUserDoc} from "@/lib/firebase-user-types";

export default function FirebaseUserCreateView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.trim();
    if (!p) {
      setLoadError(t("users.firebase.create.phone") + " *");
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
      await adminFetch<ApiFirebaseUserDoc>("/admin/firebase-users", token, {
        method: "POST",
        body: JSON.stringify({
          phoneNumber: p,
          displayName: displayName.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      router.push("/users/list");
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
          href="/users/list"
          className="text-sm text-primary hover:text-primary-hover"
        >
          {t("users.firebase.create.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("users.firebase.create.title")}
        </h1>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <label className="block text-sm text-gray-700">
          {t("users.firebase.create.phone")} *
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            placeholder="+33612345678"
          />
        </label>
        <label className="block text-sm text-gray-700">
          {t("users.firebase.create.displayName")}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
        <label className="block text-sm text-gray-700">
          {t("users.firebase.create.email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {t("users.firebase.create.submit")}
        </button>
      </form>
    </div>
  );
}
