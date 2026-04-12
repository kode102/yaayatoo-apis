"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AdminDataTable} from "@/components/admin-data-table";
import {ListPageHeader} from "@/components/list-page-header";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {EditSheet} from "@/components/edit-sheet";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import type {SiteMediaDoc} from "@/lib/i18n-types";
import {
  SERVICE_IMAGE_MAX_BYTES,
  uploadSiteMediaImageToStorage,
} from "@/lib/storage-upload";

const col = createColumnHelper<SiteMediaDoc>();

export default function SiteMediaListView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const [items, setItems] = useState<SiteMediaDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<SiteMediaDoc | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editNamespace, setEditNamespace] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSort, setEditSort] = useState("0");
  const [editAlt, setEditAlt] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const res = await adminFetch<ApiListResponse<SiteMediaDoc>>(
        `/admin/documents/siteMedia?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setItems((res.data ?? []) as SiteMediaDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = useCallback((row: SiteMediaDoc) => {
    setEditRow(row);
    setEditUrl(row.url ?? "");
    setEditNamespace(row.namespaceKey ?? "");
    setEditTags(Array.isArray(row.tags) ? row.tags.join(", ") : "");
    setEditSort(String(row.sortOrder ?? 0));
    setEditAlt(row.altText ?? "");
    setEditActive(row.active !== false);
    setFileError(null);
  }, []);

  async function saveEdit() {
    if (!editRow) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setFileError(null);
    try {
      const tags = editTags
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const so = parseInt(editSort, 10);
      await adminFetch<ApiDocResponse<SiteMediaDoc>>(
        `/admin/documents/siteMedia/${editRow.id}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            url: editUrl.trim(),
            namespaceKey: editNamespace.trim().toLowerCase(),
            tags,
            sortOrder: Number.isFinite(so) ? so : 0,
            altText: editAlt.trim(),
            active: editActive,
          }),
        },
      );
      setEditRow(null);
      await load();
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onReplaceImage(file: File | null) {
    if (!file || !editRow) return;
    setBusy(true);
    setFileError(null);
    try {
      const url = await uploadSiteMediaImageToStorage(file, {
        docId: editRow.id,
      });
      setEditUrl(url);
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : String(e);
      if (code === "IMAGE_TOO_LARGE") {
        setFileError(
          t("errors.imageTooLarge", {
            maxMb: Math.round(SERVICE_IMAGE_MAX_BYTES / (1024 * 1024)),
          }),
        );
      } else if (code === "IMAGE_TYPE") {
        setFileError(t("errors.imageType"));
      } else {
        setFileError(t("errors.imageUploadFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("siteMedia.list.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(`/admin/documents/siteMedia/${id}`, token, {
          method: "DELETE",
        });
        await load();
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load, t],
  );

  const columns = useMemo(
    (): ColumnDef<SiteMediaDoc, unknown>[] => [
      col.display({
        id: "thumb",
        header: t("siteMedia.list.colPreview"),
        cell: ({row}) => (
          // eslint-disable-next-line @next/next/no-img-element -- URLs externes admin
          <img
            src={row.original.url || "/icon.svg"}
            alt=""
            className="h-12 w-20 rounded object-cover bg-neutral-100"
          />
        ),
      }),
      col.accessor("url", {
        header: t("siteMedia.list.colUrl"),
        cell: (ctx) => (
          <span className="max-w-[220px] truncate font-mono text-xs">
            {ctx.getValue()}
          </span>
        ),
      }),
      col.accessor("namespaceKey", {
        header: t("siteMedia.list.colNamespace"),
        cell: (ctx) => (
          <span className="font-mono text-xs">
            {(ctx.getValue() as string | undefined) || "—"}
          </span>
        ),
      }),
      col.accessor("tags", {
        header: t("siteMedia.list.colTags"),
        cell: (ctx) => {
          const v = ctx.getValue() as string[] | undefined;
          return (
            <span className="text-xs">
              {Array.isArray(v) && v.length > 0 ? v.join(", ") : "—"}
            </span>
          );
        },
      }),
      col.accessor("sortOrder", {
        header: t("siteMedia.list.colSort"),
        cell: (ctx) => String(ctx.getValue() ?? 0),
      }),
      col.accessor("active", {
        header: t("siteMedia.list.colActive"),
        cell: (ctx) => (ctx.getValue() ? t("common.yes") : t("common.no")),
      }),
      col.display({
        id: "actions",
        header: "",
        cell: ({row}) => (
          <div className="inline-flex items-center justify-end gap-1">
            <RippleIconButton
              label={t("common.edit")}
              disabled={busy}
              onClick={() => openEdit(row.original)}
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
              onClick={() => void removeRow(row.original.id)}
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
        ),
      }),
    ],
    [busy, openEdit, removeRow, t],
  );

  return (
    <div className="space-y-4">
      <ListPageHeader
        title={t("siteMedia.list.title")}
        subtitle={t("siteMedia.list.subtitle")}
        createHref="/media/create"
      />
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <AdminDataTable
        columns={columns}
        data={items}
        emptyLabel={t("siteMedia.list.empty")}
      />

      <EditSheet
        open={editRow !== null}
        title={t("siteMedia.edit.sheetTitle")}
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
              disabled={busy || !editUrl.trim()}
              onClick={() => void saveEdit()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        {editRow ?
          <div className="space-y-4 text-sm">
            {fileError ?
              <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">
                {fileError}
              </p>
            : null}
            <label className="block">
              <span className="text-neutral-600">{t("siteMedia.field.url")}</span>
              <input
                className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-neutral-600">
                {t("siteMedia.field.replaceImage")}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-1 w-full text-xs"
                onChange={(e) =>
                  void onReplaceImage(e.target.files?.[0] ?? null)
                }
              />
            </label>
            <label className="block">
              <span className="text-neutral-600">
                {t("siteMedia.field.namespace")}
              </span>
              <input
                className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
                value={editNamespace}
                onChange={(e) => setEditNamespace(e.target.value)}
                placeholder="service"
              />
            </label>
            <label className="block">
              <span className="text-neutral-600">{t("siteMedia.field.tags")}</span>
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="service, hero, cta"
              />
            </label>
            <label className="block">
              <span className="text-neutral-600">{t("siteMedia.field.sortOrder")}</span>
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-1"
                value={editSort}
                onChange={(e) => setEditSort(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-neutral-600">{t("siteMedia.field.altText")}</span>
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={editAlt}
                onChange={(e) => setEditAlt(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              {t("siteMedia.field.active")}
            </label>
          </div>
        : null}
      </EditSheet>
    </div>
  );
}
