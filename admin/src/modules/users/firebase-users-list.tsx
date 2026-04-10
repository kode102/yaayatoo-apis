"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {EditSheet} from "@/components/edit-sheet";
import {ListPageHeader} from "@/components/list-page-header";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiOkResponse} from "@/lib/api";
import type {
  ApiFirebaseUserDoc,
  ApiFirebaseUsersPage,
  FirebaseUserRow,
} from "@/lib/firebase-user-types";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: {action: string}) => Promise<string>;
    };
  }
}

let recaptchaLoadPromise: Promise<void> | null = null;

function ensureRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha?.execute) return Promise.resolve();
  if (!recaptchaLoadPromise) {
    recaptchaLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://www.google.com/recaptcha/api.js?render=" +
        encodeURIComponent(siteKey);
      s.async = true;
      s.onload = () => {
        window.grecaptcha?.ready(() => resolve());
      };
      s.onerror = () => reject(new Error("recaptcha load"));
      document.head.appendChild(s);
    });
  }
  return recaptchaLoadPromise;
}

async function getRecaptchaV3Token(siteKey: string): Promise<string> {
  await ensureRecaptchaScript(siteKey);
  if (!window.grecaptcha?.execute) return "";
  return window.grecaptcha.execute(siteKey, {action: "admin_firebase_otp"});
}

const col = createColumnHelper<FirebaseUserRow>();

export default function FirebaseUsersListView() {
  const {getIdToken} = useAuth();
  const {t, locale: uiLocale} = useUiLocale();
  const [items, setItems] = useState<FirebaseUserRow[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<FirebaseUserRow | null>(null);
  const [draftPhone, setDraftPhone] = useState("");
  const [draftName, setDraftName] = useState("");

  const dateLocale = uiLocale.startsWith("en") ? "en-GB" : "fr-FR";

  const loadFirst = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const res = await adminFetch<ApiFirebaseUsersPage>(
        "/admin/firebase-users?maxResults=50",
        token,
      );
      setItems(res.data ?? []);
      setPageToken(
        typeof res.pageToken === "string" && res.pageToken.trim() ?
          res.pageToken.trim()
        : null,
      );
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [getIdToken, t]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!pageToken) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      const q = new URLSearchParams({
        maxResults: "50",
        pageToken: pageToken,
      });
      const res = await adminFetch<ApiFirebaseUsersPage>(
        `/admin/firebase-users?${q.toString()}`,
        token,
      );
      setItems((prev) => [...prev, ...(res.data ?? [])]);
      setPageToken(
        typeof res.pageToken === "string" && res.pageToken.trim() ?
          res.pageToken.trim()
        : null,
      );
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [getIdToken, pageToken]);

  const openEdit = useCallback((row: FirebaseUserRow) => {
    setEditRow(row);
    setDraftPhone(row.phoneNumber ?? "");
    setDraftName(row.displayName ?? "");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      const body: {phoneNumber?: string; displayName?: string} = {};
      if (draftPhone.trim()) body.phoneNumber = draftPhone.trim();
      if (draftName.trim()) body.displayName = draftName.trim();
      if (Object.keys(body).length === 0) {
        setLoadError(t("users.firebase.edit.needField"));
        return;
      }
      const res = await adminFetch<ApiFirebaseUserDoc>(
        `/admin/firebase-users/${encodeURIComponent(editRow.uid)}`,
        token,
        {method: "PUT", body: JSON.stringify(body)},
      );
      const next = res.data;
      if (next) {
        setItems((prev) =>
          prev.map((u) => (u.uid === next.uid ? next : u)),
        );
      }
      setEditRow(null);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [draftName, draftPhone, editRow, getIdToken, t]);

  const toggleDisable = useCallback(
    async (row: FirebaseUserRow, disable: boolean) => {
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        const path = disable ? "disable" : "enable";
        const res = await adminFetch<ApiFirebaseUserDoc>(
          `/admin/firebase-users/${encodeURIComponent(row.uid)}/${path}`,
          token,
          {method: "POST", body: "{}"},
        );
        const next = res.data;
        if (next) {
          setItems((prev) =>
            prev.map((u) => (u.uid === next.uid ? next : u)),
          );
        }
        if (editRow?.uid === row.uid && next) setEditRow(next);
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [editRow?.uid, getIdToken],
  );

  const removeUser = useCallback(
    async (uid: string) => {
      if (!confirm(t("users.firebase.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch<ApiOkResponse>(
          `/admin/firebase-users/${encodeURIComponent(uid)}`,
          token,
          {method: "DELETE"},
        );
        setItems((prev) => prev.filter((u) => u.uid !== uid));
        setEditRow((e) => (e?.uid === uid ? null : e));
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken, t],
  );

  const sendOtp = useCallback(
    async (uid: string) => {
      const token = await getIdToken();
      if (!token) return;
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
      setBusy(true);
      try {
        let recaptchaToken = "";
        if (siteKey) {
          recaptchaToken = await getRecaptchaV3Token(siteKey);
        }
        await adminFetch<ApiOkResponse & {message?: string}>(
          `/admin/firebase-users/${encodeURIComponent(uid)}/send-verification-sms`,
          token,
          {
            method: "POST",
            body: JSON.stringify({recaptchaToken}),
          },
        );
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [getIdToken],
  );

  const columns = useMemo(
    () =>
      [
        col.accessor("phoneNumber", {
          id: "phone",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.firebase.list.colPhone")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="whitespace-nowrap">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        col.accessor("displayName", {
          id: "displayName",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.firebase.list.colUsername")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="font-medium">{info.getValue() ?? "—"}</span>
          ),
        }),
        col.accessor("email", {
          id: "email",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.firebase.list.colEmail")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="text-gray-600 text-sm">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        col.accessor("uid", {
          id: "uid",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.firebase.list.colUid")}
            </SortableHeader>
          ),
          cell: (info) => (
            <code className="text-xs text-gray-500 break-all">
              {info.getValue()}
            </code>
          ),
        }),
        col.accessor("disabled", {
          id: "status",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.firebase.list.colStatus")}
            </SortableHeader>
          ),
          cell: ({row}) => (
            <span
              className={
                row.original.disabled ?
                  "text-amber-700"
                : "text-emerald-700"
              }
            >
              {row.original.disabled ?
                t("users.firebase.list.statusDisabled")
              : t("users.firebase.list.statusOk")}
            </span>
          ),
        }),
        col.accessor((row) => new Date(row.creationTime).getTime(), {
          id: "created",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("users.firebase.list.colCreated")}
            </SortableHeader>
          ),
          cell: ({row}) => (
            <span className="text-xs text-gray-500">
              {new Date(row.original.creationTime).toLocaleString(dateLocale)}
            </span>
          ),
        }),
        col.display({
          id: "actions",
          enableSorting: false,
          enableGlobalFilter: false,
          header: () => <span className="font-medium" />,
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
            </div>
          ),
        }),
      ] as ColumnDef<FirebaseUserRow, unknown>[],
    [busy, dateLocale, openEdit, t],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("users.firebase.list.title")}
        subtitle={t("users.firebase.list.subtitle")}
        createHref="/users/create"
      />
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <AdminDataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.uid}
        emptyLabel={t("users.firebase.list.empty")}
        minTableWidth={960}
        persistColumnVisibilityKey="firebase-users"
      />
      {pageToken ?
        <div className="flex justify-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadMore()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {t("users.firebase.list.loadMore")}
          </button>
        </div>
      : null}

      <EditSheet
        open={!!editRow}
        title={t("users.firebase.edit.sheetTitle")}
        onClose={() => setEditRow(null)}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={() => setEditRow(null)}
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
            {editRow?.disabled ?
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleDisable(editRow, false)}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {t("users.firebase.enable")}
              </button>
            : <button
                type="button"
                disabled={busy}
                onClick={() => void toggleDisable(editRow!, true)}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {t("users.firebase.disable")}
              </button>
            }
            <button
              type="button"
              disabled={busy || !editRow?.phoneNumber}
              onClick={() => editRow && void sendOtp(editRow.uid)}
              className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {t("users.firebase.sendOtp")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => editRow && void removeUser(editRow.uid)}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {t("common.delete")}
            </button>
          </div>
        }
      >
        <p className="text-xs text-gray-500">
          UID :{" "}
          <code className="text-gray-800">{editRow?.uid}</code>
        </p>
        <label className="block text-sm text-gray-700">
          {t("users.firebase.list.colPhone")}
          <input
            value={draftPhone}
            onChange={(e) => setDraftPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            placeholder="+33…"
          />
        </label>
        <label className="block text-sm text-gray-700">
          {t("users.firebase.list.colUsername")}
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
        <p className="text-xs text-gray-500">{t("users.firebase.sendOtpHint")}</p>
      </EditSheet>
    </div>
  );
}
