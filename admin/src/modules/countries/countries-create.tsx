"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {TranslationLocaleTabs} from "@/components/translation-locale-tabs";
import {adminFetch, type ApiDocResponse} from "@/lib/api";
import {
  hasAnyDraftName,
  sortedActiveLanguageCodes,
  type CountryDoc,
  type LocaleTextDraft,
} from "@/lib/i18n-types";

export default function CountriesCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, LocaleTextDraft>>({});
  const [code, setCode] = useState("");
  const [flagLink, setFlagLink] = useState("");
  const [activeNew, setActiveNew] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDrafts((prev) => {
      const next = {...prev};
      for (const lang of activeLanguages) {
        const c = lang.code.trim().toLowerCase();
        if (!c) continue;
        if (!(c in next)) next[c] = {name: "", description: ""};
      }
      for (const k of Object.keys(next)) {
        if (!activeLanguages.some((l) => l.code.trim().toLowerCase() === k)) {
          delete next[k];
        }
      }
      return next;
    });
  }, [activeLanguages]);

  async function createRow(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAnyDraftName(drafts)) {
      setLoadError(t("countries.create.errorNeedName"));
      return;
    }
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    const sortedCodes = sortedActiveLanguageCodes(activeLanguages);
    const el = editorLocale.trim().toLowerCase();
    const primaryCode =
      drafts[el]?.name.trim() ?
        el
      : sortedCodes.find((c) => drafts[c]?.name.trim()) ?? "";
    if (!primaryCode || !drafts[primaryCode]?.name.trim()) {
      setLoadError(t("countries.create.errorNeedName"));
      return;
    }

    setBusy(true);
    setLoadError(null);
    try {
      const res = await adminFetch<ApiDocResponse<CountryDoc>>(
        "/admin/documents/countries",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            locale: primaryCode,
            name: drafts[primaryCode]!.name.trim(),
            code,
            flagLink,
            active: activeNew,
          }),
        },
      );
      const id = res.data?.id;
      if (!id) throw new Error("Missing id");

      for (const loc of sortedCodes) {
        if (loc === primaryCode) continue;
        const d = drafts[loc];
        if (!d?.name.trim()) continue;
        await adminFetch<ApiDocResponse<CountryDoc>>(
          `/admin/documents/countries/${id}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify({locale: loc, name: d.name.trim()}),
          },
        );
      }

      setDrafts({});
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
          {t("countries.create.subtitleTabs")}
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
        <TranslationLocaleTabs
          activeLanguages={activeLanguages}
          editorLocale={editorLocale}
          drafts={drafts}
          showDescription={false}
          nameLabel={t("countries.list.countryName")}
          descriptionLabel={t("common.description")}
          onDraftChange={(loc, next) =>
            setDrafts((prev) => ({...prev, [loc]: next}))
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder={t("countries.create.codePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            required
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
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
          disabled={busy || !hasAnyDraftName(drafts)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("countries.create.submit")}
        </button>
      </form>
    </div>
  );
}
