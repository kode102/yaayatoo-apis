"use client";

import Link from "next/link";
import {useCallback, useEffect, useState} from "react";
import {ListPageHeader} from "@/components/list-page-header";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {EditSheet} from "@/components/edit-sheet";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {
  editNamePrefill,
  labelForLocale,
  localeFilledCount,
  pickSortLabel,
  type LanguageDoc,
} from "@/lib/i18n-types";
import {uiLocaleFromEditorCode} from "@/lib/ui-locale-constants";

export default function LanguagesListView() {
  const {getIdToken} = useAuth();
  const {editorLocale, refreshLanguages} = useEditorLocale();
  const {t, locale: uiLocale} = useUiLocale();
  const [items, setItems] = useState<LanguageDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<LanguageDoc | null>(null);
  const [editName, setEditName] = useState("");
  const [editFlag, setEditFlag] = useState("");

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const res = await adminFetch<ApiListResponse<LanguageDoc>>(
        `/admin/documents/languages?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setItems(res.data ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [getIdToken, editorLocale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(row: LanguageDoc) {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setBusy(true);
    try {
      await adminFetch<ApiDocResponse<LanguageDoc>>(
        `/admin/documents/languages/${row.id}`,
        token,
        {method: "PUT", body: JSON.stringify({active: !row.active})},
      );
      await load();
      await refreshLanguages();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(id: string) {
    if (!confirm(t("languages.deleteConfirm"))) return;
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setBusy(true);
    try {
      await adminFetch(`/admin/documents/languages/${id}`, token, {
        method: "DELETE",
      });
      await load();
      await refreshLanguages();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function applyEditPrefill(row: LanguageDoc, locale: string) {
    setEditName(editNamePrefill(row.translations, locale, row.code));
    setEditFlag(row.flagIconUrl ?? "");
  }

  function openEdit(row: LanguageDoc) {
    setEditRow(row);
    applyEditPrefill(row, editorLocale);
  }

  useEffect(() => {
    if (!editRow) return;
    applyEditPrefill(editRow, editorLocale);
  }, [editorLocale, editRow?.id]);

  async function saveEdit() {
    if (!editRow) return;
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setBusy(true);
    try {
      await adminFetch<ApiDocResponse<LanguageDoc>>(
        `/admin/documents/languages/${editRow.id}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            locale: (editorLocale || "fr").trim().toLowerCase(),
            name: editName.trim(),
            flagIconUrl: editFlag,
          }),
        },
      );
      setEditRow(null);
      await load();
      await refreshLanguages();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("languages.list.title")}
        subtitle={t("languages.list.subtitle")}
        createHref="/languages/create"
        extra={
          <p className="pt-2 text-xs text-gray-500">
            {t("languages.list.dictionaryHint")}{" "}
            <Link
              href="/locale/dictionary"
              className="font-medium text-primary hover:text-primary-hover"
            >
              {t("languages.list.dictionaryLink")}
            </Link>
            .
          </p>
        }
      />
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/90 text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">
                {t("languages.list.colName", {locale: editorLocale})}
              </th>
              <th className="px-3 py-2 font-medium">{t("languages.list.colCode")}</th>
              <th className="px-3 py-2 font-medium">{t("languages.list.icon")}</th>
              <th className="px-3 py-2 font-medium">{t("common.locales")}</th>
              <th className="px-3 py-2 font-medium">{t("common.active")}</th>
              <th className="px-3 py-2 font-medium">{t("common.updated")}</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((row) => (
              <tr key={row.id} className="text-gray-800">
                <td className="px-3 py-2 font-medium">
                  {pickSortLabel(row.translations, editorLocale, row.code)}
                </td>
                <td className="px-3 py-2 text-gray-500">{row.code}</td>
                <td className="w-12 px-3 py-2 align-middle">
                  {row.flagIconUrl ?
                    <a
                      href={row.flagIconUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-6 w-6 transition-opacity hover:opacity-80"
                      title={t("languages.list.openIcon")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.flagIconUrl}
                        alt={t("languages.list.iconAlt", {code: row.code})}
                        width={24}
                        height={24}
                        className="h-6 w-6 object-contain"
                        loading="lazy"
                      />
                    </a>
                  : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {localeFilledCount(row.translations)}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleActive(row)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      row.active ?
                        "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {row.active ? t("common.yes") : t("common.no")}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {row.updatedAt ?
                    new Date(row.updatedAt).toLocaleString(
                      uiLocaleFromEditorCode(uiLocale) === "en" ?
                        "en-GB"
                      : "fr-FR",
                    )
                  : "—"}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <RippleIconButton
                      label={t("common.edit")}
                      disabled={busy}
                      onClick={() => openEdit(row)}
                      className="text-primary hover:bg-primary/12"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-[18px] w-[18px]"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    </RippleIconButton>
                    <RippleIconButton
                      label={t("common.delete")}
                      disabled={busy}
                      onClick={() => void removeRow(row.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-[18px] w-[18px]"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </RippleIconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ?
          <p className="px-3 py-6 text-center text-sm text-gray-500">
            {t("languages.list.empty")}
          </p>
        : null}
      </div>
      <EditSheet
        open={!!editRow}
        title={t("languages.edit.title", {
          locale: editorLocale.toUpperCase(),
        })}
        onClose={() => setEditRow(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditRow(null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy || !editName.trim()}
              onClick={() => void saveEdit()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </>
        }
      >
        <p className="text-xs text-gray-500">
          {t("common.code")} : <code className="text-gray-700">{editRow?.code}</code>
        </p>
        <label className="block text-sm text-gray-700">
          {t("languages.list.label")}
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
        <label className="block text-sm text-gray-700">
          {t("languages.create.flagUrl")}
          <input
            value={editFlag}
            onChange={(e) => setEditFlag(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
      </EditSheet>
    </div>
  );
}
