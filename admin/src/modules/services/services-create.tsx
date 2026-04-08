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
  type LocaleTextDraft,
  type ServiceDoc,
} from "@/lib/i18n-types";
import {ServiceImageUploadField} from "@/components/service-image-upload-field";

export default function ServicesCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, LocaleTextDraft>>({});
  const [imageUrl, setImageUrl] = useState("");
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
      setLoadError(t("common.translationTabsHint"));
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
      setLoadError(t("services.create.errorNeedName"));
      return;
    }

    setBusy(true);
    setLoadError(null);
    try {
      const res = await adminFetch<ApiDocResponse<ServiceDoc>>(
        "/admin/documents/services",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            locale: primaryCode,
            name: drafts[primaryCode]!.name.trim(),
            description: drafts[primaryCode]!.description ?? "",
            imageUrl,
            active: activeNew,
          }),
        },
      );
      const id = res.data?.id;
      if (!id) throw new Error("Missing id");

      for (const code of sortedCodes) {
        if (code === primaryCode) continue;
        const d = drafts[code];
        if (!d) continue;
        const n = d.name.trim();
        const desc = d.description;
        if (!n && !desc.trim()) continue;
        const body: Record<string, unknown> = {locale: code};
        if (n) body.name = n;
        body.description = desc;
        await adminFetch<ApiDocResponse<ServiceDoc>>(
          `/admin/documents/services/${id}`,
          token,
          {method: "PUT", body: JSON.stringify(body)},
        );
      }

      setDrafts({});
      setImageUrl("");
      setActiveNew(true);
      router.push("/services/list");
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
          {t("services.create.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("services.create.subtitleTabs")}
        </p>
      </div>
      <Link
        href="/services/list"
        className="inline-block text-sm font-medium text-primary hover:text-secondary"
      >
        {t("services.create.back")}
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
          showDescription
          nameLabel={t("common.name")}
          descriptionLabel={t("common.description")}
          onDraftChange={(code, next) =>
            setDrafts((prev) => ({...prev, [code]: next}))
          }
        />
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            id="svc-active"
            checked={activeNew}
            onChange={(e) => setActiveNew(e.target.checked)}
          />
          <label htmlFor="svc-active">{t("common.active")}</label>
        </div>
        <ServiceImageUploadField
          value={imageUrl}
          onChange={setImageUrl}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !hasAnyDraftName(drafts)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("services.create.submit")}
        </button>
      </form>
    </div>
  );
}
