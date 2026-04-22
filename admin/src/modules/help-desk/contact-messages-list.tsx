"use client";

import Link from "next/link";
import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {EditSheet} from "@/components/edit-sheet";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {uiLocaleFromEditorCode} from "@/lib/ui-locale-constants";
import type {ContactMessageDoc, ContactSubjectDoc} from "@/lib/profile-doc-types";
import {ContactReplySheet} from "./contact-reply-sheet";

const col = createColumnHelper<ContactMessageDoc>();

function previewText(s: string, max = 120): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function ContactMessagesListView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const [items, setItems] = useState<ContactMessageDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailRow, setDetailRow] = useState<ContactMessageDoc | null>(null);
  const [draftHandled, setDraftHandled] = useState(false);
  const [replyRow, setReplyRow] = useState<ContactMessageDoc | null>(null);
  const [replyInitialSubject, setReplyInitialSubject] = useState("");
  const [subjects, setSubjects] = useState<ContactSubjectDoc[]>([]);

  const subjectLabel = useCallback(
    (key: string | undefined) => {
      const k = String(key ?? "").trim();
      if (k === "general") return t("helpDesk.subject.general");
      if (k === "booking") return t("helpDesk.subject.booking");
      if (k === "support") return t("helpDesk.subject.support");
      return t("helpDesk.subject.unknown");
    },
    [t],
  );

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const res = await adminFetch<ApiListResponse<ContactMessageDoc>>(
        `/admin/documents/contactMessages?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setItems((res.data ?? []) as ContactMessageDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadSubjects = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await adminFetch<ApiListResponse<ContactSubjectDoc>>(
        `/admin/documents/contactSubjects?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setSubjects((res.data ?? []) as ContactSubjectDoc[]);
    } catch {
      setSubjects([]);
    }
  }, [editorLocale, getIdToken]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const resolveSubjectLabel = useCallback(
    (vk: string | undefined) => {
      const k = String(vk ?? "").trim().toLowerCase();
      if (!k) return "—";
      const d = subjects.find(
        (s) => String(s.valueKey ?? "").trim().toLowerCase() === k,
      );
      if (d) {
        const ui = uiLocaleFromEditorCode(editorLocale);
        const fr = (d.labelFr ?? "").trim();
        const en = (d.labelEn ?? "").trim();
        if (ui === "en") return en || fr || k;
        return fr || en || k;
      }
      return subjectLabel(vk);
    },
    [editorLocale, subjects, subjectLabel],
  );

  const openDetail = useCallback((row: ContactMessageDoc) => {
    setLoadError(null);
    setDetailRow(row);
    setDraftHandled(row.handled === true);
  }, []);

  const openReply = useCallback(
    (row: ContactMessageDoc) => {
      setLoadError(null);
      setReplyRow(row);
      setReplyInitialSubject(
        t("helpDesk.reply.subjectRe", {
          subject: resolveSubjectLabel(row.subject),
        }),
      );
    },
    [resolveSubjectLabel, t],
  );

  const closeReply = useCallback(() => {
    setReplyRow(null);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailRow(null);
  }, []);

  const saveDetail = useCallback(async () => {
    if (!detailRow) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setLoadError(null);
    try {
      await adminFetch<ApiDocResponse<ContactMessageDoc>>(
        `/admin/documents/contactMessages/${encodeURIComponent(detailRow.id)}`,
        token,
        {method: "PUT", body: JSON.stringify({handled: draftHandled})},
      );
      setDetailRow(null);
      await load();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [detailRow, draftHandled, getIdToken, load]);

  const toggleRowHandled = useCallback(
    async (row: ContactMessageDoc) => {
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch<ApiDocResponse<ContactMessageDoc>>(
          `/admin/documents/contactMessages/${encodeURIComponent(row.id)}`,
          token,
          {method: "PUT", body: JSON.stringify({handled: row.handled !== true})},
        );
        await load();
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load],
  );

  const toggleRowActive = useCallback(
    async (row: ContactMessageDoc) => {
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch<ApiDocResponse<ContactMessageDoc>>(
          `/admin/documents/contactMessages/${encodeURIComponent(row.id)}`,
          token,
          {method: "PUT", body: JSON.stringify({active: row.active === false})},
        );
        await load();
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, load],
  );

  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("helpDesk.messages.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(
          `/admin/documents/contactMessages/${encodeURIComponent(id)}`,
          token,
          {method: "DELETE"},
        );
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
    () =>
      [
        col.accessor("createdAt", {
          id: "createdAt",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("helpDesk.messages.colDate")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="whitespace-nowrap text-sm text-gray-800">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        col.accessor("name", {
          id: "name",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("helpDesk.messages.colName")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="text-sm text-gray-800">{info.getValue() ?? "—"}</span>
          ),
        }),
        col.accessor("email", {
          id: "email",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("helpDesk.messages.colEmail")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="max-w-[200px] truncate text-sm text-gray-700">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        col.accessor("subject", {
          id: "subject",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("helpDesk.messages.colSubject")}
            </SortableHeader>
          ),
          cell: ({row}) => (
            <span className="text-sm text-gray-700">
              {resolveSubjectLabel(row.original.subject)}
            </span>
          ),
        }),
        col.accessor("message", {
          id: "message",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("helpDesk.messages.colPreview")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="line-clamp-2 max-w-xs text-sm text-gray-600">
              {previewText(info.getValue() ?? "")}
            </span>
          ),
        }),
        col.accessor((row) => (row.handled === true ? 1 : 0), {
          id: "handled",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("helpDesk.messages.colHandled")}
            </SortableHeader>
          ),
          cell: ({row}) => (
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleRowHandled(row.original)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                row.original.handled === true ?
                  "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900"
              }`}
            >
              {row.original.handled === true ? t("common.yes") : t("common.no")}
            </button>
          ),
          sortingFn: (a, b) =>
            Number(a.original.handled === true) -
            Number(b.original.handled === true),
        }),
        col.accessor((row) => (row.active === false ? 0 : 1), {
          id: "active",
          header: ({column}) => (
            <SortableHeader column={column}>{t("helpDesk.messages.colActive")}</SortableHeader>
          ),
          cell: ({row}) => (
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleRowActive(row.original)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                row.original.active === false ?
                  "bg-gray-100 text-gray-500"
                : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {row.original.active === false ? t("common.no") : t("common.yes")}
            </button>
          ),
          sortingFn: (a, b) =>
            Number(a.original.active !== false) -
            Number(b.original.active !== false),
        }),
        col.display({
          id: "actions",
          enableSorting: false,
          enableGlobalFilter: false,
          header: () => <span className="font-medium" />,
          cell: ({row}) => (
            <div className="inline-flex items-center justify-end gap-1">
              <RippleIconButton
                label={t("helpDesk.messages.reply")}
                disabled={busy}
                onClick={() => openReply(row.original)}
                className="text-sky-700 hover:bg-sky-50"
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
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </RippleIconButton>
              <RippleIconButton
                label={t("common.edit")}
                disabled={busy}
                onClick={() => openDetail(row.original)}
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
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l6.38-6.38a1.012 1.012 0 0 1 .639-.319h8.09c.406 0 .791.161 1.077.447l1.89 1.89a1.523 1.523 0 0 1 .427 1.066v8.09c0 .239-.094.468-.262.639l-6.38 6.38a1.012 1.012 0 0 1-.639.319H4.523a1.523 1.523 0 0 1-1.066-.427l-1.89-1.89a1.523 1.523 0 0 1-.427-1.066v-8.09Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 9.75h6"
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
      ] as ColumnDef<ContactMessageDoc, unknown>[],
    [
      busy,
      openDetail,
      openReply,
      removeRow,
      resolveSubjectLabel,
      t,
      toggleRowActive,
      toggleRowHandled,
    ],
  );

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("helpDesk.messages.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("helpDesk.messages.subtitle")}{" "}
          <Link
            href="/help-desk/subjects"
            className="text-primary hover:underline"
          >
            {t("helpDesk.messages.manageSubjectsLink")}
          </Link>
        </p>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <AdminDataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        emptyLabel={t("helpDesk.messages.empty")}
        minTableWidth={960}
        persistColumnVisibilityKey="help-desk-contact-messages"
      />
      <EditSheet
        open={!!detailRow}
        title={t("helpDesk.messages.sheetTitle")}
        onClose={closeDetail}
        panelClassName="max-w-lg"
        scrollableContent
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={closeDetail}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              onClick={() => void saveDetail()}
            >
              {t("common.save")}
            </button>
          </>
        }
      >
        {detailRow ?
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("helpDesk.messages.colName")}
              </p>
              <p className="text-sm text-gray-900">{detailRow.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("helpDesk.messages.colEmail")}
              </p>
              <p className="text-sm text-gray-900">{detailRow.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("helpDesk.messages.colSubject")}
              </p>
              <p className="text-sm text-gray-900">
                {resolveSubjectLabel(detailRow.subject)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("helpDesk.messages.fieldLocale")}
              </p>
              <p className="text-sm text-gray-900">{detailRow.locale ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("helpDesk.messages.fieldSource")}
              </p>
              <p className="text-sm text-gray-900">{detailRow.source ?? "—"}</p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t("helpDesk.messages.fieldMessage")}
              </label>
              <textarea readOnly className={`${inputCls} min-h-[160px]`} value={detailRow.message ?? ""} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={draftHandled}
                onChange={(e) => setDraftHandled(e.target.checked)}
              />
              {t("helpDesk.messages.toggleHandled")}
            </label>
          </div>
        : null}
      </EditSheet>

      <ContactReplySheet
        open={!!replyRow}
        row={replyRow}
        initialSubject={replyInitialSubject}
        onClose={closeReply}
        onSent={() => void load()}
      />
    </div>
  );
}
