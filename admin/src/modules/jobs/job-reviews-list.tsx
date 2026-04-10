"use client";

import {createColumnHelper, type ColumnDef} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AdminDataTable, SortableHeader} from "@/components/admin-data-table";
import {EditSheet} from "@/components/edit-sheet";
import {ListPageHeader} from "@/components/list-page-header";
import {RippleIconButton} from "@/components/ripple-icon-button";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {SearchableRelationSelect} from "@/components/searchable-relation-select";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import type {JobOfferDoc, JobReviewDoc} from "@/lib/profile-doc-types";

const col = createColumnHelper<JobReviewDoc>();

function formatRatingScore(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function previewText(s: string, max = 96): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function JobReviewsListView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const [items, setItems] = useState<JobReviewDoc[]>([]);
  const [offers, setOffers] = useState<JobOfferDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<JobReviewDoc | null>(null);
  const [draftOfferId, setDraftOfferId] = useState("");
  const [draftRating, setDraftRating] = useState("5");
  const [draftText, setDraftText] = useState("");
  const [draftDate, setDraftDate] = useState("");

  const offerLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of offers) {
      m.set(o.id, (o.jobTitle ?? "").trim() || o.id);
    }
    return m;
  }, [offers]);

  const offersSorted = useMemo(() => {
    return [...offers].sort((a, b) => {
      const la = offerLabelById.get(a.id) ?? a.id;
      const lb = offerLabelById.get(b.id) ?? b.id;
      return la.localeCompare(lb, undefined, {sensitivity: "base"});
    });
  }, [offerLabelById, offers]);

  const jobOfferOptions = useMemo(
    () =>
      offersSorted.map((o) => ({
        value: o.id,
        label: offerLabelById.get(o.id) ?? o.id,
        hint: o.id,
      })),
    [offersSorted, offerLabelById],
  );

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const [revRes, offRes] = await Promise.all([
        adminFetch<ApiListResponse<JobReviewDoc>>(
          `/admin/documents/jobReviews?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<JobOfferDoc>>(
          `/admin/documents/jobOffers?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setItems((revRes.data ?? []) as JobReviewDoc[]);
      setOffers((offRes.data ?? []) as JobOfferDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeEdit = useCallback(() => {
    setEditRow(null);
  }, []);

  const openEdit = useCallback((row: JobReviewDoc) => {
    setLoadError(null);
    setEditRow(row);
    setDraftOfferId(row.jobOfferId ?? "");
    setDraftRating(String(row.rating ?? 5));
    setDraftText(row.reviewText ?? "");
    setDraftDate(row.reviewedAt ?? "");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    const oid = draftOfferId.trim();
    const text = draftText.trim();
    const date = draftDate.trim();
    const ratingNum = parseFloat(draftRating.replace(",", "."));
    if (!oid || !text || !date || !Number.isFinite(ratingNum)) {
      setLoadError(t("jobs.reviews.form.needFields"));
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setLoadError(null);
    try {
      await adminFetch<ApiDocResponse<JobReviewDoc>>(
        `/admin/documents/jobReviews/${encodeURIComponent(editRow.id)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            jobOfferId: oid,
            rating: ratingNum,
            reviewText: text,
            reviewedAt: date,
          }),
        },
      );
      setEditRow(null);
      await load();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    draftDate,
    draftOfferId,
    draftRating,
    draftText,
    editRow,
    getIdToken,
    load,
    t,
  ]);

  const removeRow = useCallback(
    async (id: string) => {
      if (!confirm(t("jobs.reviews.deleteConfirm"))) return;
      const token = await getIdToken();
      if (!token) return;
      setBusy(true);
      try {
        await adminFetch(
          `/admin/documents/jobReviews/${encodeURIComponent(id)}`,
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

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none";

  const columns = useMemo(
    () =>
      [
        col.accessor("reviewedAt", {
          id: "reviewedAt",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.reviews.col.reviewedAt")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="whitespace-nowrap text-sm text-gray-800">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        col.accessor("rating", {
          id: "rating",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.reviews.col.rating")}
            </SortableHeader>
          ),
          cell: ({row}) => {
            const r = row.original.rating;
            return (
              <span className="text-sm font-medium text-gray-900">
                {t("jobs.reviews.ratingOutOfFive", {
                  score: formatRatingScore(r),
                })}
              </span>
            );
          },
        }),
        col.accessor("jobOfferId", {
          id: "offer",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.reviews.col.jobOffer")}
            </SortableHeader>
          ),
          cell: ({row}) => (
            <span className="text-sm text-gray-700">
              {offerLabelById.get(row.original.jobOfferId) ??
                row.original.jobOfferId}
            </span>
          ),
        }),
        col.accessor("reviewText", {
          id: "text",
          header: ({column}) => (
            <SortableHeader column={column}>
              {t("jobs.reviews.col.text")}
            </SortableHeader>
          ),
          cell: (info) => (
            <span className="line-clamp-2 text-sm text-gray-600">
              {previewText(info.getValue() ?? "")}
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
      ] as ColumnDef<JobReviewDoc, unknown>[],
    [busy, offerLabelById, openEdit, removeRow, t],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={t("jobs.reviews.list.title")}
        subtitle={t("jobs.reviews.list.subtitle")}
        createHref="/jobs/reviews/create"
      />
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <AdminDataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        emptyLabel={t("jobs.reviews.list.empty")}
        minTableWidth={900}
        persistColumnVisibilityKey="job-reviews"
      />
      <EditSheet
        open={!!editRow}
        title={t("jobs.reviews.editTitle")}
        onClose={closeEdit}
        panelClassName="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={closeEdit}
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
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.reviews.field.jobOffer")}
            <SearchableRelationSelect
              value={draftOfferId}
              onChange={setDraftOfferId}
              options={jobOfferOptions}
              emptyOptionLabel={t("jobs.reviews.field.jobOfferPlaceholder")}
              disabled={busy}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.reviews.field.rating")}
            <input
              type="number"
              min={0.5}
              max={5}
              step={0.5}
              className={inputCls}
              value={draftRating}
              onChange={(e) => setDraftRating(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.reviews.field.reviewedAt")}
            <input
              type="date"
              className={inputCls}
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t("jobs.reviews.field.reviewText")}
            <textarea
              rows={5}
              className={`${inputCls} resize-y`}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
          </label>
        </div>
      </EditSheet>
    </div>
  );
}
