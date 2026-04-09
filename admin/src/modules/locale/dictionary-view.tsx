"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import Link from "next/link";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {EditSheet} from "@/components/edit-sheet";
import {adminFetch, type ApiOkResponse} from "@/lib/api";
import {DEFAULT_MESSAGES} from "@/lib/default-messages";
import {labelForRegionalLanguage, type LanguageDoc} from "@/lib/i18n-types";
import {uiLocaleFromEditorCode} from "@/lib/ui-locale-constants";

const KEY_RE = /^[a-z][a-z0-9_.-]{0,127}$/;

const FALLBACK_COLUMN_CODES = ["fr", "en"] as const;

function defaultBuiltIn(localeCode: string, messageKey: string): string {
  const base = uiLocaleFromEditorCode(localeCode);
  return DEFAULT_MESSAGES[base][messageKey] ?? "";
}

function langColumnLabel(lang: LanguageDoc, editorLocale: string): string {
  return labelForRegionalLanguage(
    lang.translations,
    editorLocale,
    lang.code.toUpperCase(),
  );
}

type Row = {
  key: string;
  values: Record<string, string>;
  hasOverride: boolean;
};

const dictRowColumnHelper = createColumnHelper<Row>();

export default function DictionaryView() {
  const {t, refreshDictionary, defaultKeys, locale: uiLocale} = useUiLocale();
  const {getIdToken} = useAuth();
  const {activeLanguages, editorLocale} = useEditorLocale();
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newDraft, setNewDraft] = useState<Record<string, string>>({});

  const columnLangs: LanguageDoc[] = useMemo(() => {
    if (activeLanguages.length > 0) return activeLanguages;
    return FALLBACK_COLUMN_CODES.map((code) => ({
      id: `fallback-${code}`,
      code,
      flagIconUrl: "",
      active: true,
      translations: {},
    }));
  }, [activeLanguages]);

  const columnCodes = useMemo(
    () => columnLangs.map((l) => l.code.trim().toLowerCase()),
    [columnLangs],
  );

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setOverrides({});
      return;
    }
    setLoadError(null);
    try {
      const res = await adminFetch<{
        success: boolean;
        data?: Record<string, Record<string, string>>;
      }>("/admin/ui-dictionary", token);
      setOverrides(res.data ?? {});
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: Row[] = useMemo(() => {
    const keys = new Set<string>([...defaultKeys, ...Object.keys(overrides)]);
    return [...keys]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const o = overrides[key];
        const values: Record<string, string> = {};
        for (const code of columnCodes) {
          const fromDoc = o?.[code];
          values[code] =
            fromDoc !== undefined ? String(fromDoc) : defaultBuiltIn(code, key);
        }
        return {
          key,
          values,
          hasOverride: o !== undefined,
        };
      });
  }, [defaultKeys, overrides, columnCodes]);

  const openEdit = useCallback((row: Row) => {
    setEditKey(row.key);
    setEditDraft({...row.values});
  }, []);

  function setEditField(code: string, value: string) {
    setEditDraft((d) => ({...d, [code]: value}));
  }

  function setNewField(code: string, value: string) {
    setNewDraft((d) => ({...d, [code]: value}));
  }

  async function saveEdit() {
    if (!editKey) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      const translations: Record<string, string> = {};
      for (const code of columnCodes) {
        translations[code] = editDraft[code] ?? "";
      }
      await adminFetch<{success: boolean}>(
        `/admin/ui-dictionary/${encodeURIComponent(editKey)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({translations}),
        },
      );
      setEditKey(null);
      await load();
      await refreshDictionary();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addKey() {
    const k = newKey.trim().toLowerCase();
    if (!KEY_RE.test(k)) {
      setLoadError(t("dictionary.invalidKey"));
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setLoadError(null);
    try {
      const translations: Record<string, string> = {};
      for (const code of columnCodes) {
        translations[code] = newDraft[code] ?? "";
      }
      await adminFetch<{success: boolean}>(
        `/admin/ui-dictionary/${encodeURIComponent(k)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({translations}),
        },
      );
      setNewKey("");
      setNewDraft({});
      await load();
      await refreshDictionary();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const deleteOverride = useCallback(
    async (key: string) => {
      if (!overrides[key]) return;
      if (!confirm(t("dictionary.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch<ApiOkResponse>(
          `/admin/ui-dictionary/${encodeURIComponent(key)}`,
          token,
          {method: "DELETE"},
        );
        await load();
        await refreshDictionary();
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load, overrides, refreshDictionary, t],
  );

  const minTableWidth = 280 + columnCodes.length * 160;

  const columns = useMemo(
    () =>
      [
      dictRowColumnHelper.accessor("key", {
        header: ({column}) => (
          <SortableHeader column={column}>
            {t("dictionary.columnKey")}
          </SortableHeader>
        ),
        cell: ({row}) => (
          <>
            <span className="align-middle font-mono text-xs text-gray-700">
              {row.original.key}
            </span>
            {row.original.hasOverride ?
              <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                {t("dictionary.badgeOverride")}
              </span>
            : null}
          </>
        ),
      }),
      ...columnLangs.map((lang) => {
        const code = lang.code.trim().toLowerCase();
        return dictRowColumnHelper.accessor((r) => r.values[code] ?? "", {
          id: `lang_${code}`,
          header: ({column}) => (
            <SortableHeader column={column}>
              <span>
                {langColumnLabel(lang, editorLocale)}
                <span className="ml-1 font-mono text-[10px] font-normal text-gray-400">
                  {code}
                </span>
              </span>
            </SortableHeader>
          ),
          cell: (info) => {
            const raw = String(info.getValue() ?? "").trim();
            return (
              <span className="max-w-[200px] truncate text-gray-600">
                {raw ? String(info.getValue()) : t("dictionary.emptyCol")}
              </span>
            );
          },
        });
      }),
      dictRowColumnHelper.display({
        id: "actions",
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => <span className="font-medium" />,
        cell: ({row}) => (
          <div className="space-x-2 text-right whitespace-nowrap">
            <button
              type="button"
              disabled={busy}
              onClick={() => openEdit(row.original)}
              className="text-xs font-medium text-primary hover:text-secondary"
            >
              {t("common.edit")}
            </button>
            {row.original.hasOverride ?
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteOverride(row.original.key)}
                className="text-xs font-medium text-red-600 hover:text-red-800"
              >
                {t("common.delete")}
              </button>
            : null}
          </div>
        ),
      }),
    ] as ColumnDef<Row, unknown>[],
    [busy, columnLangs, deleteOverride, editorLocale, openEdit, t],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("dictionary.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("dictionary.subtitle")}</p>
        <p className="mt-2 text-xs text-gray-400">{t("dictionary.hint")}</p>
        <p className="mt-2 text-xs text-gray-500">
          {t("dictionary.siteLocalesHint")}{" "}
          <Link
            href="/languages/list"
            className="font-medium text-primary hover:text-primary-hover"
          >
            {t("dictionary.languagesLink")}
          </Link>
          .
        </p>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">
          {t("dictionary.addKey")}
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <label className="block text-xs text-gray-600">
            {t("dictionary.newKey")}
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={t("dictionary.keyHint")}
              className="mt-1 w-full max-w-md rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {columnLangs.map((lang) => {
              const code = lang.code.trim().toLowerCase();
              return (
                <label
                  key={lang.id}
                  className="block min-w-[140px] flex-1 text-xs text-gray-600"
                >
                  {langColumnLabel(lang, editorLocale)}
                  <span className="ml-1 font-mono text-[10px] text-gray-400">
                    ({code})
                  </span>
                  <input
                    value={newDraft[code] ?? ""}
                    onChange={(e) => setNewField(code, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
                  />
                </label>
              );
            })}
          </div>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void addKey()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>

      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.key}
        emptyLabel={t("dictionary.tableEmpty")}
        minTableWidth={minTableWidth}
      />

      <EditSheet
        open={!!editKey}
        title={t("dictionary.editTitle")}
        onClose={() => setEditKey(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditKey(null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveEdit()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </>
        }
      >
        <p className="font-mono text-xs text-gray-500">{editKey}</p>
        <div className="mt-3 space-y-3">
          {columnLangs.map((lang) => {
            const code = lang.code.trim().toLowerCase();
            return (
              <label key={lang.id} className="block text-sm text-gray-700">
                {langColumnLabel(lang, editorLocale)}
                <span className="ml-1 font-mono text-xs text-gray-400">
                  ({code})
                </span>
                <textarea
                  value={editDraft[code] ?? ""}
                  onChange={(e) => setEditField(code, e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                />
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          {t("dictionary.currentUiLocale", {locale: uiLocale})}
        </p>
      </EditSheet>
    </div>
  );
}
