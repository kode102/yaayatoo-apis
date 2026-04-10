"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch} from "@/lib/api";
import type {
  ApiFirebaseUsersPage,
  FirebaseUserRow,
} from "@/lib/firebase-user-types";

function userMatchesQuery(u: FirebaseUserRow, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    u.uid.toLowerCase().includes(s) ||
    (u.phoneNumber?.toLowerCase().includes(s) ?? false) ||
    (u.displayName?.toLowerCase().includes(s) ?? false) ||
    (u.email?.toLowerCase().includes(s) ?? false)
  );
}

function primaryLine(u: FirebaseUserRow): string {
  const parts = [
    u.displayName?.trim(),
    u.phoneNumber?.trim(),
    u.email?.trim(),
  ].filter(Boolean);
  return parts[0] ?? u.uid;
}

type Props = {
  value: string;
  onChange: (uid: string) => void;
  disabled?: boolean;
};

export function FirebaseUidSearchSelect({value, onChange, disabled}: Props) {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<FirebaseUserRow[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadFirst = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setListError(null);
    try {
      const res = await adminFetch<ApiFirebaseUsersPage>(
        "/admin/firebase-users?maxResults=50",
        token,
      );
      setUsers(res.data ?? []);
      setPageToken(
        typeof res.pageToken === "string" && res.pageToken.trim() ?
          res.pageToken.trim()
        : null,
      );
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  const loadMore = useCallback(async () => {
    if (!pageToken) return;
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        maxResults: "50",
        pageToken,
      });
      const res = await adminFetch<ApiFirebaseUsersPage>(
        `/admin/firebase-users?${q.toString()}`,
        token,
      );
      setUsers((prev) => [...prev, ...(res.data ?? [])]);
      setPageToken(
        typeof res.pageToken === "string" && res.pageToken.trim() ?
          res.pageToken.trim()
        : null,
      );
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [getIdToken, pageToken]);

  useEffect(() => {
    if (!open) return;
    const tmr = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(tmr);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(ev: MouseEvent) {
      if (!rootRef.current?.contains(ev.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const filtered = useMemo(
    () => users.filter((u) => userMatchesQuery(u, search)),
    [users, search],
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.uid === value),
    [users, value],
  );

  function pick(uid: string) {
    onChange(uid);
    setOpen(false);
    setSearch("");
  }

  const customQ = search.trim();
  const showApplyCustom =
    customQ.length > 0 &&
    customQ !== value.trim() &&
    !/\s/.test(customQ);

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            setSearch("");
            return;
          }
          setOpen(true);
          if (users.length === 0) void loadFirst();
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate">
          {!value.trim() ?
            t("users.firebase.uidSelect.choose")
          : selectedUser ?
            <>
              <span className="block truncate font-medium">
                {primaryLine(selectedUser)}
              </span>
              <span className="mt-0.5 block truncate font-mono text-xs text-gray-500">
                {selectedUser.uid}
              </span>
            </>
          : <span className="block truncate font-mono text-xs text-gray-800">
              {value}
            </span>
          }
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ?
        <div
          className="absolute z-40 mt-1 w-full rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
          role="listbox"
        >
          <div className="px-2 pb-2">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("users.firebase.uidSelect.searchPlaceholder")}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
              autoComplete="off"
            />
          </div>

          {listError ?
            <div className="px-3 py-2">
              <p className="text-xs text-red-600">{listError}</p>
              <button
                type="button"
                onClick={() => void loadFirst()}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                {t("users.firebase.uidSelect.retry")}
              </button>
            </div>
          : null}

          {loading && users.length === 0 ?
            <p className="px-3 py-2 text-xs text-gray-500">
              {t("users.firebase.uidSelect.loading")}
            </p>
          : null}

          <ul className="max-h-56 overflow-y-auto px-1">
            {filtered.map((u) => (
              <li key={u.uid}>
                <button
                  type="button"
                  role="option"
                  aria-selected={u.uid === value}
                  onClick={() => pick(u.uid)}
                  className={`flex w-full flex-col items-start rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50 ${
                    u.uid === value ? "bg-primary/8" : ""
                  }`}
                >
                  <span className="font-medium text-gray-900">
                    {primaryLine(u)}
                  </span>
                  <span className="break-all font-mono text-xs text-gray-500">
                    {u.uid}
                  </span>
                  {u.disabled ?
                    <span className="mt-0.5 text-xs text-amber-700">
                      {t("users.firebase.list.statusDisabled")}
                    </span>
                  : null}
                </button>
              </li>
            ))}
          </ul>

          {users.length > 0 && filtered.length === 0 && !loading ?
            <p className="px-3 py-2 text-xs text-gray-500">
              {t("users.firebase.uidSelect.noResults")}
            </p>
          : null}

          {pageToken ?
            <div className="border-t border-gray-100 px-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadMore()}
                className="w-full rounded-lg py-2 text-center text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                {t("users.firebase.uidSelect.loadMore")}
              </button>
            </div>
          : null}

          {showApplyCustom ?
            <div className="border-t border-gray-100 px-2 pt-2">
              <button
                type="button"
                onClick={() => pick(customQ)}
                className="w-full rounded-lg border border-dashed border-gray-300 px-2 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                {t("users.firebase.uidSelect.applyCustom", {
                  uid:
                    customQ.length > 48 ?
                      `${customQ.slice(0, 24)}…${customQ.slice(-12)}`
                    : customQ,
                })}
              </button>
            </div>
          : null}
        </div>
      : null}
    </div>
  );
}
