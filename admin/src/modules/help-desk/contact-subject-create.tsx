"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse} from "@/lib/api";
import type {ContactSubjectDoc} from "@/lib/profile-doc-types";

export default function ContactSubjectCreateView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();
  const [valueKey, setValueKey] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const vk = valueKey.trim().toLowerCase();
    const fr = labelFr.trim();
    const en = labelEn.trim();
    const so = parseInt(sortOrder.replace(/\s/g, ""), 10);
    if (!vk || !/^[a-z][a-z0-9_-]{0,63}$/.test(vk)) {
      setLoadError(t("helpDesk.subjects.errorKey"));
      return;
    }
    if (!fr && !en) {
      setLoadError(t("helpDesk.subjects.errorLabels"));
      return;
    }
    if (!Number.isFinite(so)) {
      setLoadError(t("helpDesk.subjects.errorSort"));
      return;
    }
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setBusy(true);
    setLoadError(null);
    try {
      await adminFetch<ApiDocResponse<ContactSubjectDoc>>(
        "/admin/documents/contactSubjects",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            valueKey: vk,
            labelFr: fr,
            labelEn: en,
            sortOrder: so,
            active,
          }),
        },
      );
      router.push("/help-desk/subjects");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/help-desk/subjects"
          className="text-sm text-primary hover:text-primary-hover"
        >
          {t("helpDesk.subjects.createBack")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("helpDesk.subjects.createTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("helpDesk.subjects.createSubtitle")}
        </p>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="cs-key" className="text-sm font-medium text-gray-700">
            {t("helpDesk.subjects.fieldKey")}
          </label>
          <input
            id="cs-key"
            className={inputCls}
            value={valueKey}
            onChange={(e) => setValueKey(e.target.value)}
            placeholder="general"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-500">{t("helpDesk.subjects.hintKey")}</p>
        </div>
        <div>
          <label htmlFor="cs-fr" className="text-sm font-medium text-gray-700">
            {t("helpDesk.subjects.colLabelFr")}
          </label>
          <input
            id="cs-fr"
            className={inputCls}
            value={labelFr}
            onChange={(e) => setLabelFr(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cs-en" className="text-sm font-medium text-gray-700">
            {t("helpDesk.subjects.colLabelEn")}
          </label>
          <input
            id="cs-en"
            className={inputCls}
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cs-sort" className="text-sm font-medium text-gray-700">
            {t("helpDesk.subjects.colSort")}
          </label>
          <input
            id="cs-sort"
            type="number"
            className={inputCls}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {t("common.active")}
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {t("helpDesk.subjects.createSubmit")}
        </button>
      </form>
    </div>
  );
}
