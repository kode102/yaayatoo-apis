"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse} from "@/lib/api";
import type {CountryDoc} from "@/lib/i18n-types";

export default function CountriesCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [flagLink, setFlagLink] = useState("");
  const [activeNew, setActiveNew] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createRow(e: React.FormEvent) {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setBusy(true);
    setLoadError(null);
    try {
      await adminFetch<ApiDocResponse<CountryDoc>>("/admin/documents/countries", token, {
        method: "POST",
        body: JSON.stringify({
          locale: editorLocale,
          name,
          code,
          flagLink,
          active: activeNew,
        }),
      });
      setName("");
      setCode("");
      setFlagLink("");
      setActiveNew(true);
      router.push("/countries/list");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("countries.create.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("countries.create.subtitle", {locale: editorLocale.toUpperCase()})}
        </p>
      </div>
      <Link
        href="/countries/list"
        className="inline-block text-sm font-medium text-primary hover:text-secondary"
      >
        {t("countries.create.back")}
      </Link>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form
        onSubmit={(e) => void createRow(e)}
        className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder={t("countries.create.namePlaceholder", {
              locale: editorLocale.toUpperCase(),
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            required
          />
          <input
            placeholder={t("countries.create.codePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            required
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={activeNew}
              onChange={(e) => setActiveNew(e.target.checked)}
            />
            {t("common.active")}
          </label>
        </div>
        <input
          placeholder={t("countries.create.flagUrl")}
          value={flagLink}
          onChange={(e) => setFlagLink(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("countries.create.submit")}
        </button>
      </form>
    </div>
  );
}
