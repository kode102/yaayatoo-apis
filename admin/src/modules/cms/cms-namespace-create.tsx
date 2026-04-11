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
  type CmsNamespaceDoc,
  type LocaleTextDraft,
} from "@/lib/i18n-types";

export default function CmsNamespaceCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, LocaleTextDraft>>({});
  const [namespaceKey, setNamespaceKey] = useState("");
  const [activeNew, setActiveNew] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDrafts((prev) => {
      const next = {...prev};
      for (const lang of activeLanguages) {
        const c = lang.code.trim().toLowerCase();
        if (!c) continue;
        if (!(c in next)) next[c] = {name: "", description: "", label: ""};
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
      setLoadError(t("cms.namespace.createErrorNeedName"));
      return;
    }
    const nk = namespaceKey.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(nk)) {
      setLoadError(t("cms.namespace.invalidKey"));
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
      setLoadError(t("cms.namespace.createErrorNeedName"));
      return;
    }

    setBusy(true);
    setLoadError(null);
    try {
      const res = await adminFetch<ApiDocResponse<CmsNamespaceDoc>>(
        "/admin/documents/cmsNamespaces",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            locale: primaryCode,
            name: drafts[primaryCode]!.name.trim(),
            namespaceKey: nk,
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
        await adminFetch<ApiDocResponse<CmsNamespaceDoc>>(
          `/admin/documents/cmsNamespaces/${id}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify({locale: loc, name: d.name.trim()}),
          },
        );
      }
      router.push("/cms/namespaces/list");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/cms/namespaces/list"
          className="text-sm text-primary hover:underline"
        >
          {t("cms.namespace.backToList")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("cms.namespace.createTitle")}
        </h1>
        <p className="text-sm text-gray-500">{t("cms.namespace.createSubtitle")}</p>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form onSubmit={(e) => void createRow(e)} className="space-y-6">
        <label className="block text-sm text-gray-700">
          {t("cms.namespace.keyField")} *
          <input
            required
            value={namespaceKey}
            onChange={(e) => setNamespaceKey(e.target.value)}
            placeholder="home"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={activeNew}
            onChange={(e) => setActiveNew(e.target.checked)}
          />
          {t("common.active")}
        </label>
        <TranslationLocaleTabs
          activeLanguages={activeLanguages}
          editorLocale={editorLocale}
          drafts={drafts}
          showDescription={false}
          nameLabel={t("cms.namespace.labelField")}
          descriptionLabel={t("common.description")}
          onDraftChange={(code, next) =>
            setDrafts((prev) => ({...prev, [code]: next}))
          }
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("cms.namespace.createSubmit")}
        </button>
      </form>
    </div>
  );
}
