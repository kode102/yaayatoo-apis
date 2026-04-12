"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse} from "@/lib/api";
import type {SiteMediaDoc} from "@/lib/i18n-types";
import {
  SERVICE_IMAGE_MAX_BYTES,
  uploadSiteMediaImageToStorage,
} from "@/lib/storage-upload";

export default function SiteMediaCreateView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [namespaceKey, setNamespaceKey] = useState("service");
  const [tags, setTags] = useState("service");
  const [sortOrder, setSortOrder] = useState("0");
  const [altText, setAltText] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setLoadError(null);
    try {
      const u = await uploadSiteMediaImageToStorage(file, {});
      setUrl(u);
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : String(e);
      if (code === "IMAGE_TOO_LARGE") {
        setLoadError(
          t("errors.imageTooLarge", {
            maxMb: String(
              Math.round(SERVICE_IMAGE_MAX_BYTES / (1024 * 1024)),
            ),
          }),
        );
      } else if (code === "IMAGE_TYPE") {
        setLoadError(t("errors.imageType"));
      } else {
        setLoadError(t("errors.imageUploadFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = url.trim();
    if (!u) {
      setLoadError(t("siteMedia.create.errorNeedUrl"));
      return;
    }
    const tagList = tags
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (tagList.length === 0) {
      setLoadError(t("siteMedia.create.errorNeedTags"));
      return;
    }
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    const so = parseInt(sortOrder, 10);
    setBusy(true);
    setLoadError(null);
    try {
      await adminFetch<ApiDocResponse<SiteMediaDoc>>(
        "/admin/documents/siteMedia",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            url: u,
            namespaceKey: namespaceKey.trim().toLowerCase(),
            tags: tagList,
            sortOrder: Number.isFinite(so) ? so : 0,
            altText: altText.trim(),
            active,
          }),
        },
      );
      router.push("/media/list");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/media/list"
          className="text-sm text-primary hover:underline"
        >
          {t("siteMedia.create.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {t("siteMedia.create.title")}
        </h1>
        <p className="text-sm text-gray-500">{t("siteMedia.create.subtitle")}</p>
      </div>
      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}
      <form onSubmit={(e) => void submit(e)} className="space-y-4 text-sm">
        <label className="block">
          <span className="text-neutral-700">{t("siteMedia.field.upload")}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={busy}
            className="mt-1 w-full text-xs"
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="block">
          <span className="text-neutral-700">{t("siteMedia.field.url")} *</span>
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
            placeholder="https://…"
          />
        </label>
        <label className="block">
          <span className="text-neutral-700">
            {t("siteMedia.field.namespace")}
          </span>
          <input
            value={namespaceKey}
            onChange={(e) => setNamespaceKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
            placeholder="service"
          />
        </label>
        <label className="block">
          <span className="text-neutral-700">{t("siteMedia.field.tags")} *</span>
          <input
            required
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
            placeholder="service, hero"
          />
        </label>
        <label className="block">
          <span className="text-neutral-700">{t("siteMedia.field.sortOrder")}</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-neutral-700">{t("siteMedia.field.altText")}</span>
          <input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {t("siteMedia.field.active")}
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("siteMedia.create.submit")}
        </button>
      </form>
    </div>
  );
}
