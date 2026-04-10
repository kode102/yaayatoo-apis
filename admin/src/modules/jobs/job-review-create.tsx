"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import type {JobOfferDoc, JobReviewDoc} from "@/lib/profile-doc-types";

export default function JobReviewCreateView() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const {t} = useUiLocale();
  const router = useRouter();
  const [offers, setOffers] = useState<JobOfferDoc[]>([]);
  const [jobOfferId, setJobOfferId] = useState("");
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewedAt, setReviewedAt] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const loadOffers = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await adminFetch<ApiListResponse<JobOfferDoc>>(
        `/admin/documents/jobOffers?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setOffers((res.data ?? []) as JobOfferDoc[]);
    } catch {
      setOffers([]);
    }
  }, [editorLocale, getIdToken]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const oid = jobOfferId.trim();
    const text = reviewText.trim();
    const date = reviewedAt.trim();
    const ratingNum = parseFloat(rating.replace(",", "."));
    if (!oid || !text || !date || !Number.isFinite(ratingNum)) {
      setLoadError(t("jobs.reviews.form.needFields"));
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
      await adminFetch<ApiDocResponse<JobReviewDoc>>(
        "/admin/documents/jobReviews",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            jobOfferId: oid,
            rating: ratingNum,
            reviewText: text,
            reviewedAt: date,
          }),
        },
      );
      router.push("/jobs/reviews/list");
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
          href="/jobs/reviews/list"
          className="text-sm text-primary hover:text-primary-hover"
        >
          {t("jobs.reviews.create.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("jobs.reviews.create.title")}
        </h1>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          {t("jobs.reviews.field.jobOffer")}
          <select
            required
            className={inputCls}
            value={jobOfferId}
            onChange={(e) => setJobOfferId(e.target.value)}
          >
            <option value="">
              {t("jobs.reviews.field.jobOfferPlaceholder")}
            </option>
            {offersSorted.map((o) => (
              <option key={o.id} value={o.id}>
                {offerLabelById.get(o.id) ?? o.id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t("jobs.reviews.field.rating")}
          <input
            required
            type="number"
            min={0.5}
            max={5}
            step={0.5}
            className={inputCls}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t("jobs.reviews.field.reviewedAt")}
          <input
            required
            type="date"
            className={inputCls}
            value={reviewedAt}
            onChange={(e) => setReviewedAt(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t("jobs.reviews.field.reviewText")}
          <textarea
            required
            rows={6}
            className={`${inputCls} resize-y`}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
        >
          {t("jobs.reviews.create.submit")}
        </button>
      </form>
    </div>
  );
}
