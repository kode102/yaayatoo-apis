"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {
  type CmsNamespaceDoc,
  type CmsSectionDoc,
  type CmsSectionTypeId,
  inferCmsSectionType,
  labelForLocale,
  pickSortLabel,
  sortedActiveLanguageCodes,
} from "@/lib/i18n-types";

type SiteLocaleDraft = {
  name: string;
  description: string;
  metaKeyword: string;
  metaAuthor: string;
  metaDescription: string;
  facebookLink: string;
  twitterLink: string;
  linkedinLink: string;
  skypeLink: string;
  instagramLink: string;
  youtubeLink: string;
  footerLeftText: string;
};

type WhyLocaleDraft = {
  name: string;
  section1Title: string;
  /** Une entrée = une puce ; sérialisé en texte multi-ligne côté API */
  section1Items: string[];
  section2Title: string;
  section2Items: string[];
  readMoreLabel: string;
};

type BlogLocaleDraft = {name: string; description: string};

const SECTION_TYPES: {id: CmsSectionTypeId; labelKey: string}[] = [
  {id: "why_choose_us", labelKey: "cms.sectionType.whyChooseUs"},
  {id: "site_settings", labelKey: "cms.sectionType.siteSettings"},
  {id: "blog_section", labelKey: "cms.sectionType.blogSection"},
];

function emptySite(): SiteLocaleDraft {
  return {
    name: "",
    description: "",
    metaKeyword: "",
    metaAuthor: "",
    metaDescription: "",
    facebookLink: "",
    twitterLink: "",
    linkedinLink: "",
    skypeLink: "",
    instagramLink: "",
    youtubeLink: "",
    footerLeftText: "",
  };
}

function emptyWhy(): WhyLocaleDraft {
  return {
    name: "",
    section1Title: "",
    section1Items: [""],
    section2Title: "",
    section2Items: [""],
    readMoreLabel: "",
  };
}

/** Charge depuis Firestore (une ligne = une puce). */
function linesFromStored(raw: string | undefined): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [""];
  return raw.split(/\r?\n/).map((l) => l.replace(/\r/g, ""));
}

/** Enregistrement API (inchangé pour le backend). */
function linesToStored(lines: string[]): string {
  return lines.map((l) => l.replace(/\r?\n/g, " ").trimEnd()).join("\n");
}

function emptyBlog(): BlogLocaleDraft {
  return {name: "", description: ""};
}

function siteFromBlock(b: Record<string, unknown> | undefined): SiteLocaleDraft {
  const d = emptySite();
  if (!b) return d;
  return {
    name: typeof b.name === "string" ? b.name : "",
    description: typeof b.description === "string" ? b.description : "",
    metaKeyword: typeof b.metaKeyword === "string" ? b.metaKeyword : "",
    metaAuthor: typeof b.metaAuthor === "string" ? b.metaAuthor : "",
    metaDescription:
      typeof b.metaDescription === "string" ? b.metaDescription : "",
    facebookLink: typeof b.facebookLink === "string" ? b.facebookLink : "",
    twitterLink: typeof b.twitterLink === "string" ? b.twitterLink : "",
    linkedinLink: typeof b.linkedinLink === "string" ? b.linkedinLink : "",
    skypeLink: typeof b.skypeLink === "string" ? b.skypeLink : "",
    instagramLink: typeof b.instagramLink === "string" ? b.instagramLink : "",
    youtubeLink: typeof b.youtubeLink === "string" ? b.youtubeLink : "",
    footerLeftText: typeof b.footerLeftText === "string" ? b.footerLeftText : "",
  };
}

function whyFromBlock(b: Record<string, unknown> | undefined): WhyLocaleDraft {
  const d = emptyWhy();
  if (!b) return d;
  const s1 =
    typeof b.section1Items === "string" ? b.section1Items : "";
  const s2 =
    typeof b.section2Items === "string" ? b.section2Items : "";
  return {
    name: typeof b.name === "string" ? b.name : "",
    section1Title: typeof b.section1Title === "string" ? b.section1Title : "",
    section1Items: linesFromStored(s1),
    section2Title: typeof b.section2Title === "string" ? b.section2Title : "",
    section2Items: linesFromStored(s2),
    readMoreLabel: typeof b.readMoreLabel === "string" ? b.readMoreLabel : "",
  };
}

function blogFromBlock(b: Record<string, unknown> | undefined): BlogLocaleDraft {
  const d = emptyBlog();
  if (!b) return d;
  return {
    name: typeof b.name === "string" ? b.name : "",
    description: typeof b.description === "string" ? b.description : "",
  };
}

function filledSite(d: SiteLocaleDraft): boolean {
  return Object.values(d).some((v) => v.trim().length > 0);
}
function filledWhy(d: WhyLocaleDraft): boolean {
  if (
    d.name.trim() ||
    d.section1Title.trim() ||
    d.section2Title.trim() ||
    d.readMoreLabel.trim()
  ) {
    return true;
  }
  if (d.section1Items.some((x) => x.trim().length > 0)) return true;
  if (d.section2Items.some((x) => x.trim().length > 0)) return true;
  return false;
}
function filledBlog(d: BlogLocaleDraft): boolean {
  return d.name.trim().length > 0 || d.description.trim().length > 0;
}

type WhyBulletFieldsetProps = {
  label: string;
  items: string[];
  onItemsChange: (next: string[]) => void;
  addLabel: string;
  removeLabel: string;
};

function WhyBulletFieldset({
  label,
  items,
  onItemsChange,
  addLabel,
  removeLabel,
}: WhyBulletFieldsetProps) {
  function updateLine(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onItemsChange(next);
  }
  function addLine() {
    onItemsChange([...items, ""]);
  }
  function removeLine(index: number) {
    if (items.length <= 1) {
      onItemsChange([""]);
      return;
    }
    onItemsChange(items.filter((_, i) => i !== index));
  }
  return (
    <fieldset className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
      <legend className="mb-1 px-0.5 text-sm font-medium text-gray-800">
        {label}
      </legend>
      <div className="space-y-2">
        {items.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={line}
              onChange={(e) => updateLine(idx, e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm leading-none text-gray-600 hover:bg-red-50 hover:text-red-700"
              aria-label={removeLabel}
              title={removeLabel}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addLine}
        className="mt-1 rounded-lg border border-dashed border-primary/40 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

export default function CmsSectionsView() {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const {activeLanguages, editorLocale} = useEditorLocale();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [namespaces, setNamespaces] = useState<CmsNamespaceDoc[]>([]);
  const [sections, setSections] = useState<CmsSectionDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLocaleCode, setActiveLocaleCode] = useState(
    editorLocale.trim().toLowerCase(),
  );

  const [siteDrafts, setSiteDrafts] = useState<Record<string, SiteLocaleDraft>>(
    {},
  );
  const [whyDrafts, setWhyDrafts] = useState<Record<string, WhyLocaleDraft>>({});
  const [blogDrafts, setBlogDrafts] = useState<Record<string, BlogLocaleDraft>>(
    {},
  );
  const [active, setActive] = useState(true);
  const [registrationActive, setRegistrationActive] = useState(false);
  const [videoImageUrl, setVideoImageUrl] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [readMoreUrl, setReadMoreUrl] = useState("");
  const [assignNamespaceId, setAssignNamespaceId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [cNs, setCNs] = useState("");
  const [cType, setCType] = useState<CmsSectionTypeId>("why_choose_us");
  const [cSub, setCSub] = useState("why-choose-us");
  const [cTitle, setCTitle] = useState("");

  const sortedCodes = useMemo(
    () => sortedActiveLanguageCodes(activeLanguages),
    [activeLanguages],
  );

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId],
  );

  const sectionKind = selected ? inferCmsSectionType(selected) : "site_settings";

  const loadAll = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLoadError(t("errors.session"));
      return;
    }
    setLoadError(null);
    try {
      const [nsRes, secRes] = await Promise.all([
        adminFetch<ApiListResponse<CmsNamespaceDoc>>(
          `/admin/documents/cmsNamespaces?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<CmsSectionDoc>>(
          `/admin/documents/cmsSections?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setNamespaces((nsRes.data ?? []) as CmsNamespaceDoc[]);
      setSections((secRes.data ?? []) as CmsSectionDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [editorLocale, getIdToken, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const wanted = editorLocale.trim().toLowerCase();
    setActiveLocaleCode((prev) => (sortedCodes.includes(prev) ? prev : wanted));
  }, [editorLocale, sortedCodes]);

  useEffect(() => {
    if (!selected) {
      setSiteDrafts({});
      setWhyDrafts({});
      setBlogDrafts({});
      setAssignNamespaceId("");
      return;
    }
    const nextSite: Record<string, SiteLocaleDraft> = {};
    const nextWhy: Record<string, WhyLocaleDraft> = {};
    const nextBlog: Record<string, BlogLocaleDraft> = {};
    for (const code of sortedCodes) {
      const block = selected.translations?.[code] as Record<string, unknown> | undefined;
      nextSite[code] = siteFromBlock(block);
      nextWhy[code] = whyFromBlock(block);
      nextBlog[code] = blogFromBlock(block);
    }
    setSiteDrafts(nextSite);
    setWhyDrafts(nextWhy);
    setBlogDrafts(nextBlog);
    setActive(selected.active ?? true);
    setRegistrationActive(Boolean(selected.registrationActive));
    setVideoImageUrl(selected.videoImageUrl ?? "");
    setVideoLink(selected.videoLink ?? "");
    setReadMoreUrl(selected.readMoreUrl ?? "");
    setAssignNamespaceId(selected.namespaceId ?? "");
  }, [selected, sortedCodes]);

  const grouped = useMemo(() => {
    const orphan: CmsSectionDoc[] = [];
    const byNs = new Map<string, CmsSectionDoc[]>();
    for (const n of namespaces) byNs.set(n.id, []);
    for (const s of sections) {
      const nid = s.namespaceId?.trim();
      if (nid && byNs.has(nid)) {
        byNs.get(nid)!.push(s);
      } else {
        orphan.push(s);
      }
    }
    return {byNs, orphan};
  }, [namespaces, sections]);

  async function saveSection() {
    if (!selected) return;
    if (sortedCodes.length === 0) {
      setLoadError(t("common.translationTabsNoLanguages"));
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    const kind = inferCmsSectionType(selected);
    const filledCodes = sortedCodes.filter((code) => {
      if (kind === "why_choose_us") {
        return filledWhy(whyDrafts[code] ?? emptyWhy());
      }
      if (kind === "blog_section") {
        return filledBlog(blogDrafts[code] ?? emptyBlog());
      }
      return filledSite(siteDrafts[code] ?? emptySite());
    });
    if (filledCodes.length === 0) {
      setLoadError(t("cms.errorNeedTranslation"));
      return;
    }

    setSaving(true);
    setLoadError(null);
    try {
      await adminFetch<ApiDocResponse<CmsSectionDoc>>(
        `/admin/documents/cmsSections/${selected.id}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            namespaceId: assignNamespaceId.trim(),
            sectionType: kind,
            active,
            registrationActive,
            videoImageUrl,
            videoLink,
            readMoreUrl,
          }),
        },
      );

      for (const code of filledCodes) {
        const body: Record<string, unknown> = {locale: code};
        if (kind === "why_choose_us") {
          const d = whyDrafts[code] ?? emptyWhy();
          if (!d.name.trim()) {
            setLoadError(t("cms.why.errorNeedHeading"));
            setSaving(false);
            return;
          }
          Object.assign(body, {
            name: d.name.trim(),
            section1Title: d.section1Title,
            section1Items: linesToStored(d.section1Items),
            section2Title: d.section2Title,
            section2Items: linesToStored(d.section2Items),
            readMoreLabel: d.readMoreLabel,
          });
        } else if (kind === "blog_section") {
          const d = blogDrafts[code] ?? emptyBlog();
          Object.assign(body, {
            name: d.name.trim(),
            description: d.description,
          });
          if (!d.name.trim()) {
            setLoadError(t("cms.errorNeedTranslation"));
            setSaving(false);
            return;
          }
        } else {
          const d = siteDrafts[code] ?? emptySite();
          if (!d.name.trim()) {
            setLoadError(t("cms.errorNeedTranslation"));
            setSaving(false);
            return;
          }
          Object.assign(body, {
            name: d.name.trim(),
            description: d.description,
            metaKeyword: d.metaKeyword,
            metaAuthor: d.metaAuthor,
            metaDescription: d.metaDescription,
            facebookLink: d.facebookLink,
            twitterLink: d.twitterLink,
            linkedinLink: d.linkedinLink,
            skypeLink: d.skypeLink,
            instagramLink: d.instagramLink,
            youtubeLink: d.youtubeLink,
            footerLeftText: d.footerLeftText,
          });
        }
        await adminFetch<ApiDocResponse<CmsSectionDoc>>(
          `/admin/documents/cmsSections/${selected.id}`,
          token,
          {method: "PUT", body: JSON.stringify(body)},
        );
      }
      await loadAll();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection() {
    if (!selected) return;
    if (!confirm(t("cms.section.deleteConfirm"))) return;
    const token = await getIdToken();
    if (!token) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/documents/cmsSections/${selected.id}`, token, {
        method: "DELETE",
      });
      setSelectedId(null);
      await loadAll();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function createSection(e: React.FormEvent) {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) return;
    if (!cNs || !cSub.trim() || !cTitle.trim()) {
      setLoadError(t("cms.section.createError"));
      return;
    }
    const ns = namespaces.find((n) => n.id === cNs);
    if (!ns) {
      setLoadError(t("cms.section.createError"));
      return;
    }
    const primary =
      sortedCodes.find((c) => c === editorLocale.trim().toLowerCase()) ??
      sortedCodes[0];
    if (!primary) {
      setLoadError(t("common.translationTabsNoLanguages"));
      return;
    }

    setSaving(true);
    setLoadError(null);
    try {
      const res = await adminFetch<ApiDocResponse<CmsSectionDoc>>(
        "/admin/documents/cmsSections",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            locale: primary,
            name: cTitle.trim(),
            sectionKey: ns.namespaceKey,
            subsectionKey: cSub.trim().toLowerCase().replace(/\s+/g, "-"),
            namespaceId: ns.id,
            sectionType: cType,
            active: true,
            registrationActive: false,
            videoImageUrl: "",
            videoLink: "",
            readMoreUrl: "",
          }),
        },
      );
      const id = res.data?.id;
      setCreateOpen(false);
      setCTitle("");
      setCSub("why-choose-us");
      await loadAll();
      if (id) setSelectedId(id);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const currentSite = siteDrafts[activeLocaleCode] ?? emptySite();
  const currentWhy = whyDrafts[activeLocaleCode] ?? emptyWhy();
  const currentBlog = blogDrafts[activeLocaleCode] ?? emptyBlog();
  const hasLocales = sortedCodes.length > 0;

  function tabFilled(code: string): boolean {
    if (!selected) return false;
    const k = inferCmsSectionType(selected);
    if (k === "why_choose_us") {
      return filledWhy(whyDrafts[code] ?? emptyWhy());
    }
    if (k === "blog_section") {
      return filledBlog(blogDrafts[code] ?? emptyBlog());
    }
    return filledSite(siteDrafts[code] ?? emptySite());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("cms.title")}</h1>
          <p className="text-sm text-gray-500">
            {t("cms.subtitleSections", {locale: editorLocale})}
          </p>
          <p className="mt-1 text-sm">
            <Link
              href="/cms/namespaces/list"
              className="text-primary hover:underline"
            >
              {t("cms.linkManageNamespaces")}
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
        >
          {t("cms.section.createButton")}
        </button>
      </div>

      {loadError ?
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      : null}

      {createOpen ?
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("cms.section.createTitle")}
            </h2>
            <form onSubmit={(e) => void createSection(e)} className="mt-4 space-y-3">
              <label className="block text-sm text-gray-700">
                {t("cms.section.fieldNamespace")}
                <select
                  required
                  value={cNs}
                  onChange={(e) => setCNs(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">{t("cms.section.namespacePlaceholder")}</option>
                  {namespaces.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.namespaceKey} —{" "}
                      {labelForLocale(n.translations, editorLocale) ||
                        pickSortLabel(n.translations, editorLocale, n.namespaceKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-gray-700">
                {t("cms.section.fieldType")}
                <select
                  value={cType}
                  onChange={(e) => setCType(e.target.value as CmsSectionTypeId)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {SECTION_TYPES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {t(st.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-gray-700">
                {t("cms.section.fieldSubKey")}
                <input
                  value={cSub}
                  onChange={(e) => setCSub(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("cms.section.fieldInitialTitle")}
                <input
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving || namespaces.length === 0}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {t("cms.section.createSubmit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            {t("cms.menuTitle")}
          </p>
          {namespaces.length === 0 ?
            <p className="px-2 text-sm text-amber-800">{t("cms.noNamespacesHint")}</p>
          : null}
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {namespaces.map((ns) => {
              const list = grouped.byNs.get(ns.id) ?? [];
              return (
                <div key={ns.id}>
                  <p className="px-2 text-xs font-semibold text-gray-500 uppercase">
                    {labelForLocale(ns.translations, editorLocale) ||
                      ns.namespaceKey}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {list.map((s) => {
                      const sel = selectedId === s.id;
                      const kind = inferCmsSectionType(s);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                            sel ?
                              "bg-primary/10 font-medium text-primary"
                            : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className="truncate">
                            {pickSortLabel(
                              s.translations,
                              editorLocale,
                              s.subsectionKey,
                            )}
                          </span>
                          <span className="truncate text-[11px] text-gray-400">
                            {t(
                              SECTION_TYPES.find((x) => x.id === kind)?.labelKey ??
                                "cms.sectionType.siteSettings",
                            )}{" "}
                            · {s.subsectionKey}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {grouped.orphan.length > 0 ?
              <div>
                <p className="px-2 text-xs font-semibold text-amber-700 uppercase">
                  {t("cms.section.unassigned")}
                </p>
                <div className="mt-1 space-y-0.5">
                  {grouped.orphan.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full rounded-lg px-2.5 py-2 text-left text-sm ${
                        selectedId === s.id ?
                          "bg-primary/10 font-medium text-primary"
                        : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pickSortLabel(
                        s.translations,
                        editorLocale,
                        s.subsectionKey,
                      )}
                    </button>
                  ))}
                </div>
              </div>
            : null}
          </div>
        </aside>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {!selected ?
            <p className="text-sm text-gray-500">{t("cms.section.selectHint")}</p>
          : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {pickSortLabel(
                      selected.translations,
                      editorLocale,
                      selected.subsectionKey,
                    )}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {selected.sectionKey} / {selected.subsectionKey} ·{" "}
                    {t(
                      SECTION_TYPES.find((x) => x.id === sectionKind)?.labelKey ??
                        "cms.sectionType.siteSettings",
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                    {t("common.active")}
                  </label>
                  <button
                    type="button"
                    onClick={() => void deleteSection()}
                    disabled={saving}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>

              <label className="mb-3 block text-sm text-gray-700">
                {t("cms.section.fieldNamespace")}
                <select
                  value={assignNamespaceId}
                  onChange={(e) => setAssignNamespaceId(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">{t("cms.section.unassignedOption")}</option>
                  {namespaces.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.namespaceKey}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mb-3 flex flex-wrap gap-1 border-b border-gray-200 pb-2">
                {sortedCodes.map((code) => {
                  const selectedTab = code === activeLocaleCode;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveLocaleCode(code)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        selectedTab ?
                          "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      } ${tabFilled(code) ? "ring-1 ring-inset ring-emerald-300/80" : ""}`}
                    >
                      {code.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              {!hasLocales ?
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t("common.translationTabsNoLanguages")}
                </p>
              : null}

              {sectionKind === "why_choose_us" ?
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">{t("cms.why.itemsHintDynamic")}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-sm text-gray-700 md:col-span-2">
                      {t("cms.why.fieldVideoImage")}
                      <input
                        value={videoImageUrl}
                        onChange={(e) => setVideoImageUrl(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm text-gray-700 md:col-span-2">
                      {t("cms.why.fieldVideoLink")}
                      <input
                        value={videoLink}
                        onChange={(e) => setVideoLink(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldMainHeading")} *
                    <input
                      value={currentWhy.name}
                      onChange={(e) =>
                        setWhyDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptyWhy()),
                            name: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldSection1Title")}
                    <input
                      value={currentWhy.section1Title}
                      onChange={(e) =>
                        setWhyDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptyWhy()),
                            section1Title: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <WhyBulletFieldset
                    label={t("cms.why.fieldSection1Items")}
                    items={currentWhy.section1Items}
                    onItemsChange={(next) =>
                      setWhyDrafts((p) => ({
                        ...p,
                        [activeLocaleCode]: {
                          ...(p[activeLocaleCode] ?? emptyWhy()),
                          section1Items: next,
                        },
                      }))
                    }
                    addLabel={t("cms.why.addBullet")}
                    removeLabel={t("cms.why.removeBullet")}
                  />
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldSection2Title")}
                    <input
                      value={currentWhy.section2Title}
                      onChange={(e) =>
                        setWhyDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptyWhy()),
                            section2Title: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <WhyBulletFieldset
                    label={t("cms.why.fieldSection2Items")}
                    items={currentWhy.section2Items}
                    onItemsChange={(next) =>
                      setWhyDrafts((p) => ({
                        ...p,
                        [activeLocaleCode]: {
                          ...(p[activeLocaleCode] ?? emptyWhy()),
                          section2Items: next,
                        },
                      }))
                    }
                    addLabel={t("cms.why.addBullet")}
                    removeLabel={t("cms.why.removeBullet")}
                  />
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldReadMoreLabel")}
                    <input
                      value={currentWhy.readMoreLabel}
                      onChange={(e) =>
                        setWhyDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptyWhy()),
                            readMoreLabel: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldReadMoreUrl")}
                    <input
                      value={readMoreUrl}
                      onChange={(e) => setReadMoreUrl(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              : sectionKind === "blog_section" ?
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm text-gray-700">
                    {t("common.name")} *
                    <input
                      value={currentBlog.name}
                      onChange={(e) =>
                        setBlogDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptyBlog()),
                            name: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700 md:col-span-2">
                    {t("common.description")}
                    <textarea
                      rows={3}
                      value={currentBlog.description}
                      onChange={(e) =>
                        setBlogDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptyBlog()),
                            description: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              :
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={registrationActive}
                      onChange={(e) => setRegistrationActive(e.target.checked)}
                    />
                    {t("cms.fields.registrationActive")}
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("common.name")} *
                    <input
                      value={currentSite.name}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            name: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("common.description")}
                    <input
                      value={currentSite.description}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            description: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.metaKeyword")}
                    <input
                      value={currentSite.metaKeyword}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            metaKeyword: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.metaAuthor")}
                    <input
                      value={currentSite.metaAuthor}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            metaAuthor: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700 md:col-span-2">
                    {t("cms.fields.metaDescription")}
                    <textarea
                      rows={3}
                      value={currentSite.metaDescription}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            metaDescription: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.facebookLink")}
                    <input
                      value={currentSite.facebookLink}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            facebookLink: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.twitterLink")}
                    <input
                      value={currentSite.twitterLink}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            twitterLink: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.linkedinLink")}
                    <input
                      value={currentSite.linkedinLink}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            linkedinLink: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.skypeLink")}
                    <input
                      value={currentSite.skypeLink}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            skypeLink: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.instagramLink")}
                    <input
                      value={currentSite.instagramLink}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            instagramLink: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.fields.youtubeLink")}
                    <input
                      value={currentSite.youtubeLink}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            youtubeLink: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700 md:col-span-2">
                    {t("cms.fields.footerLeftText")}
                    <textarea
                      rows={3}
                      value={currentSite.footerLeftText}
                      onChange={(e) =>
                        setSiteDrafts((p) => ({
                          ...p,
                          [activeLocaleCode]: {
                            ...(p[activeLocaleCode] ?? emptySite()),
                            footerLeftText: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              }

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void saveSection()}
                  disabled={saving || !hasLocales}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
