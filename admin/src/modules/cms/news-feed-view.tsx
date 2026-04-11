"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {Link2} from "lucide-react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {ServiceLabelHtmlEditor} from "@/components/service-label-html-editor";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  type LanguageDoc,
  type NewsFeedDoc,
} from "@/lib/i18n-types";
import {
  adminFetch,
  type ApiDocResponse,
  type ApiListResponse,
  type ApiOkResponse,
} from "@/lib/api";

type NewsFeedDraft = {
  id: string | null;
  active: boolean;
  redirectUrl: string;
  titleHtmlByLocale: Record<string, string>;
};

function emptyDraft(locales: string[]): NewsFeedDraft {
  const titleHtmlByLocale: Record<string, string> = {};
  for (const locale of locales) {
    titleHtmlByLocale[locale] = "";
  }
  return {
    id: null,
    active: true,
    redirectUrl: "",
    titleHtmlByLocale,
  };
}

function readTitleHtmlByLocale(
  doc: NewsFeedDoc,
  locales: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of locales) out[locale] = "";
  const map = doc.translations?.[CMS_DEFAULT_COUNTRY_KEY];
  if (!map || typeof map !== "object") return out;
  for (const locale of locales) {
    const block = map[locale];
    const html = typeof block?.labelHtml === "string" ? block.labelHtml : "";
    out[locale] = html;
  }
  return out;
}

function previewTitle(
  doc: NewsFeedDoc,
  uiLocale: string,
  localeCodes: string[],
): string {
  const exact = doc.translations?.[CMS_DEFAULT_COUNTRY_KEY]?.[uiLocale]?.labelHtml;
  if (typeof exact === "string" && exact.trim()) return exact;
  for (const code of localeCodes) {
    const hit = doc.translations?.[CMS_DEFAULT_COUNTRY_KEY]?.[code]?.labelHtml;
    if (typeof hit === "string" && hit.trim()) return hit;
  }
  return "";
}

export default function NewsFeedView() {
  const {getIdToken} = useAuth();
  const {t, locale: uiLocale} = useUiLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<NewsFeedDoc[]>([]);
  const [localeCodes, setLocaleCodes] = useState<string[]>(["fr", "en"]);
  const [draft, setDraft] = useState<NewsFeedDraft>(() => emptyDraft(["fr", "en"]));

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoading(false);
      setError(t("errors.session"));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [newsRes, langsRes] = await Promise.all([
        adminFetch<ApiListResponse<NewsFeedDoc>>(
          "/admin/documents/newsFeed",
          token,
        ),
        adminFetch<ApiListResponse<LanguageDoc>>(
          "/admin/documents/languages",
          token,
        ),
      ]);
      const langs = (langsRes.data ?? [])
        .filter((lang) => lang.active !== false)
        .map((lang) => String(lang.code ?? "").trim().toLowerCase())
        .filter(Boolean);
      const nextLocales = langs.length ? [...new Set(langs)] : ["fr", "en"];
      setLocaleCodes(nextLocales);
      setItems((newsRes.data ?? []) as NewsFeedDoc[]);
      setDraft((prev) => {
        if (prev.id) return prev;
        return emptyDraft(nextLocales);
      });
    } catch {
      setError(t("cms.newsFeed.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
          String(a.updatedAt ?? a.createdAt ?? ""),
          "fr",
        ),
      ),
    [items],
  );

  function beginCreate() {
    setError(null);
    setSuccess(null);
    setDraft(emptyDraft(localeCodes));
  }

  function beginEdit(doc: NewsFeedDoc) {
    setError(null);
    setSuccess(null);
    setDraft({
      id: doc.id,
      active: doc.active !== false,
      redirectUrl: String(doc.redirectUrl ?? ""),
      titleHtmlByLocale: readTitleHtmlByLocale(doc, localeCodes),
    });
  }

  async function onDelete(id: string) {
    const token = await getIdToken();
    if (!token) {
      setError(t("errors.session"));
      return;
    }
    if (!window.confirm(t("cms.newsFeed.deleteConfirm"))) return;
    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      await adminFetch<ApiOkResponse>(`/admin/documents/newsFeed/${id}`, token, {
        method: "DELETE",
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function onSave() {
    const token = await getIdToken();
    if (!token) {
      setError(t("errors.session"));
      return;
    }
    const filled = localeCodes
      .map((code) => ({
        locale: code,
        titleHtml: String(draft.titleHtmlByLocale[code] ?? "").trim(),
      }))
      .filter((x) => x.titleHtml);
    if (filled.length === 0) {
      setError(t("cms.newsFeed.errorNeedTitle"));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let id = draft.id;
      if (!id) {
        const first = filled[0]!;
        const created = await adminFetch<ApiDocResponse<NewsFeedDoc>>(
          "/admin/documents/newsFeed",
          token,
          {
            method: "POST",
            body: JSON.stringify({
              locale: first.locale,
              titleHtml: first.titleHtml,
              redirectUrl: draft.redirectUrl.trim(),
              active: draft.active,
            }),
          },
        );
        id = created.data?.id ?? null;
      } else {
        await adminFetch<ApiDocResponse<NewsFeedDoc>>(
          `/admin/documents/newsFeed/${id}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify({
              redirectUrl: draft.redirectUrl.trim(),
              active: draft.active,
            }),
          },
        );
      }
      if (!id) {
        throw new Error("Document id manquant après création.");
      }
      for (const row of filled) {
        await adminFetch<ApiDocResponse<NewsFeedDoc>>(
          `/admin/documents/newsFeed/${id}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify({
              locale: row.locale,
              titleHtml: row.titleHtml,
            }),
          },
        );
      }
      setSuccess(t("cms.newsFeed.saveSuccess"));
      await load();
      beginCreate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("cms.newsFeed.title")}</h1>
          <p className="text-sm text-gray-500">{t("cms.newsFeed.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={beginCreate}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          {t("cms.newsFeed.addButton")}
        </button>
      </div>

      {error ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      : null}
      {success ?
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      : null}

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm text-gray-700">
            {t("cms.newsFeed.field.redirectUrl")}
            <div className="relative mt-1">
              <Link2
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="url"
                value={draft.redirectUrl}
                onChange={(e) =>
                  setDraft((prev) => ({...prev, redirectUrl: e.target.value}))
                }
                className="w-full rounded-lg border border-gray-200 py-2 pr-3 pl-9 text-sm"
              />
            </div>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) =>
                setDraft((prev) => ({...prev, active: e.target.checked}))
              }
            />
            <span>{t("cms.newsFeed.field.active")}</span>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {localeCodes.map((code) => (
            <label key={code} className="block text-sm text-gray-700">
              {t("cms.newsFeed.field.titleHtml", {locale: code})}
              <div className="mt-1 rounded-lg border border-gray-200 bg-white p-2">
                <ServiceLabelHtmlEditor
                  value={draft.titleHtmlByLocale[code] ?? ""}
                  onChange={(html) =>
                    setDraft((prev) => ({
                      ...prev,
                      titleHtmlByLocale: {
                        ...prev.titleHtmlByLocale,
                        [code]: html,
                      },
                    }))
                  }
                />
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ?
              t("common.saving") :
              draft.id ? t("cms.newsFeed.form.update") : t("cms.newsFeed.form.create")}
          </button>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {sortedItems.length === 0 ?
          <p className="text-sm text-gray-500">{t("cms.newsFeed.empty")}</p>
        : null}
        {sortedItems.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-200 p-3"
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-sm text-gray-900"
                dangerouslySetInnerHTML={{
                  __html: previewTitle(doc, uiLocale, localeCodes) || "—",
                }}
              />
              <p className="mt-1 truncate text-xs text-gray-500">
                {String(doc.redirectUrl ?? "—")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => beginEdit(doc)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs hover:bg-gray-50"
              >
                {t("cms.newsFeed.editButton")}
              </button>
              <button
                type="button"
                disabled={deletingId === doc.id}
                onClick={() => void onDelete(doc.id)}
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
