"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {
  CMS_DEFAULT_COUNTRY_KEY,
  type CountryDoc,
  type CmsNamespaceDoc,
  type CmsSectionDoc,
  type CmsSectionTypeId,
  inferCmsSectionType,
  labelForLocale,
  pickSortLabel,
  pickSortLabelCms,
  sortedActiveLanguageCodes,
} from "@/lib/i18n-types";
import {CmsVideoThumbnailField} from "@/components/cms-video-thumbnail-field";
import {SearchableRelationSelect} from "@/components/searchable-relation-select";
import {ServiceLabelHtmlEditor} from "@/components/service-label-html-editor";

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

type BannerLocaleDraft = {
  name: string;
  /** Une entrée = une URL d’avatar ; sérialisé en texte multi-ligne côté API */
  bannerAvatarLinks: string[];
  bannerAverageRating: string;
  bannerTrustCount: string;
  bannerTrustLabel: string;
};

type StatsLocaleDraft = {
  name: string;
  statRows: {label: string; value: string}[];
};

type FeatureItemDraft = {
  sectionTitle: string;
  iconSvg: string;
  iconStyle: "1" | "2" | "3";
  sectionContent: string;
};

type FeaturesLocaleDraft = {
  name: string;
  items: FeatureItemDraft[];
};

type FaqItemDraft = {question: string; answer: string};
type FaqColumnDraft = {title: string; items: FaqItemDraft[]};
type FaqLocaleDraft = {name: string; columns: FaqColumnDraft[]};

/** Ordre du menu : blocs page d’accueil regroupés, puis blog, puis réglages. */
const SECTION_TYPES: {id: CmsSectionTypeId; labelKey: string}[] = [
  {id: "why_choose_us", labelKey: "cms.sectionType.whyChooseUs"},
  {id: "banner", labelKey: "cms.sectionType.banner"},
  {id: "stat", labelKey: "cms.sectionType.stat"},
  {id: "features", labelKey: "cms.sectionType.features"},
  {id: "faq", labelKey: "cms.sectionType.faq"},
  {id: "blog_section", labelKey: "cms.sectionType.blogSection"},
  {id: "profile_listing", labelKey: "cms.sectionType.profileListing"},
  {id: "site_settings", labelKey: "cms.sectionType.siteSettings"},
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

function emptyBanner(): BannerLocaleDraft {
  return {
    name: "",
    bannerAvatarLinks: [""],
    bannerAverageRating: "",
    bannerTrustCount: "",
    bannerTrustLabel: "",
  };
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

function bannerFromBlock(
  b: Record<string, unknown> | undefined,
): BannerLocaleDraft {
  const d = emptyBanner();
  if (!b) return d;
  const links =
    typeof b.bannerAvatarLinks === "string" ? b.bannerAvatarLinks : "";
  return {
    name: typeof b.name === "string" ? b.name : "",
    bannerAvatarLinks: linesFromStored(links),
    bannerAverageRating:
      typeof b.bannerAverageRating === "string" ? b.bannerAverageRating : "",
    bannerTrustCount:
      typeof b.bannerTrustCount === "string" ? b.bannerTrustCount : "",
    bannerTrustLabel:
      typeof b.bannerTrustLabel === "string" ? b.bannerTrustLabel : "",
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

function filledBanner(d: BannerLocaleDraft): boolean {
  if (d.name.trim()) return true;
  if (d.bannerAverageRating.trim() || d.bannerTrustCount.trim()) return true;
  if (d.bannerTrustLabel.trim()) return true;
  if (d.bannerAvatarLinks.some((u) => u.trim().length > 0)) return true;
  return false;
}

function emptyStats(): StatsLocaleDraft {
  return {
    name: "",
    statRows: [
      {label: "", value: ""},
      {label: "", value: ""},
      {label: "", value: ""},
      {label: "", value: ""},
    ],
  };
}

function statRowsToStored(rows: {label: string; value: string}[]): string {
  return rows.map((r) => `${r.label}|${r.value}`).join("\n");
}

function statsFromBlock(
  b: Record<string, unknown> | undefined,
): StatsLocaleDraft {
  const d = emptyStats();
  if (!b) return d;
  const raw = typeof b.statRows === "string" ? b.statRows : "";
  if (!raw.trim()) {
    return {...d, name: typeof b.name === "string" ? b.name : ""};
  }
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\r/g, ""));
  const statRows = lines.map((line) => {
    const i = line.indexOf("|");
    if (i < 0) return {label: line.trim(), value: ""};
    return {
      label: line.slice(0, i).trim(),
      value: line.slice(i + 1).trim(),
    };
  });
  return {
    name: typeof b.name === "string" ? b.name : "",
    statRows: statRows.length > 0 ? statRows : emptyStats().statRows,
  };
}

function filledStats(d: StatsLocaleDraft): boolean {
  if (d.name.trim()) return true;
  return d.statRows.some((r) => r.label.trim() || r.value.trim());
}

function emptyFeatureItem(): FeatureItemDraft {
  return {
    sectionTitle: "",
    iconSvg: "",
    iconStyle: "1",
    sectionContent: "",
  };
}

function emptyFeatures(): FeaturesLocaleDraft {
  return {name: "", items: [emptyFeatureItem()]};
}

function normalizeIconStyle(v: unknown): "1" | "2" | "3" {
  const s = String(v ?? "1").trim();
  if (s === "2" || s === "3") return s;
  return "1";
}

function parseFeatureItemRow(o: unknown): FeatureItemDraft | null {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const r = o as Record<string, unknown>;
  return {
    sectionTitle: typeof r.sectionTitle === "string" ? r.sectionTitle : "",
    iconSvg: typeof r.iconSvg === "string" ? r.iconSvg : "",
    iconStyle: normalizeIconStyle(r.iconStyle),
    sectionContent:
      typeof r.sectionContent === "string" ? r.sectionContent : "",
  };
}

function featuresFromBlock(
  b: Record<string, unknown> | undefined,
): FeaturesLocaleDraft {
  const d = emptyFeatures();
  if (!b) return d;
  const name = typeof b.name === "string" ? b.name : "";
  const raw = typeof b.featureItems === "string" ? b.featureItems : "";
  if (!raw.trim()) return {...d, name};
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return {...d, name};
    const items = arr
      .map(parseFeatureItemRow)
      .filter((x): x is FeatureItemDraft => x !== null);
    return {
      name,
      items: items.length > 0 ? items : [emptyFeatureItem()],
    };
  } catch {
    return {...d, name};
  }
}

function featuresToStored(items: FeatureItemDraft[]): string {
  return JSON.stringify(items);
}

function emptyFaqItem(): FaqItemDraft {
  return {question: "", answer: ""};
}

function emptyFaqColumn(): FaqColumnDraft {
  return {title: "", items: [emptyFaqItem()]};
}

function emptyFaq(): FaqLocaleDraft {
  return {
    name: "",
    columns: [emptyFaqColumn(), emptyFaqColumn(), emptyFaqColumn()],
  };
}

function parseFaqItemRow(o: unknown): FaqItemDraft | null {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const r = o as Record<string, unknown>;
  return {
    question: typeof r.question === "string" ? r.question : "",
    answer: typeof r.answer === "string" ? r.answer : "",
  };
}

function parseFaqColumnRow(o: unknown): FaqColumnDraft | null {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const r = o as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title : "";
  const rawItems = r.items;
  let items: FaqItemDraft[] = [emptyFaqItem()];
  if (Array.isArray(rawItems)) {
    const parsed = rawItems
      .map(parseFaqItemRow)
      .filter((x): x is FaqItemDraft => x !== null);
    if (parsed.length > 0) items = parsed;
  }
  return {title, items};
}

function faqFromBlock(b: Record<string, unknown> | undefined): FaqLocaleDraft {
  const d = emptyFaq();
  if (!b) return d;
  const name = typeof b.name === "string" ? b.name : "";
  const raw = typeof b.faqSections === "string" ? b.faqSections : "";
  if (!raw.trim()) return {...d, name};
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return {...d, name};
    const columns = arr
      .map(parseFaqColumnRow)
      .filter((x): x is FaqColumnDraft => x !== null);
    return {
      name,
      columns:
        columns.length > 0 ? columns : [emptyFaqColumn(), emptyFaqColumn(), emptyFaqColumn()],
    };
  } catch {
    return {...d, name};
  }
}

function faqToStored(columns: FaqColumnDraft[]): string {
  return JSON.stringify(columns);
}

function filledFaq(d: FaqLocaleDraft): boolean {
  if (d.name.trim()) return true;
  return d.columns.some(
    (col) =>
      col.title.trim() ||
      col.items.some((it) => it.question.trim() || it.answer.trim()),
  );
}

function filledFeatures(d: FeaturesLocaleDraft): boolean {
  if (d.name.trim()) return true;
  return d.items.some(
    (it) =>
      it.sectionTitle.trim() ||
      it.iconSvg.trim() ||
      it.sectionContent.trim(),
  );
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

type StatKpiFieldsetProps = {
  label: string;
  hint?: string;
  rows: {label: string; value: string}[];
  onRowsChange: (next: {label: string; value: string}[]) => void;
  addLabel: string;
  removeLabel: string;
  placeholderLabel: string;
  placeholderValue: string;
};

function StatKpiFieldset({
  label,
  hint,
  rows,
  onRowsChange,
  addLabel,
  removeLabel,
  placeholderLabel,
  placeholderValue,
}: StatKpiFieldsetProps) {
  function updateRow(
    index: number,
    patch: Partial<{label: string; value: string}>,
  ) {
    const next = rows.map((r, i) => (i === index ? {...r, ...patch} : r));
    onRowsChange(next);
  }
  function addRow() {
    onRowsChange([...rows, {label: "", value: ""}]);
  }
  function removeRow(index: number) {
    if (rows.length <= 1) {
      onRowsChange([{label: "", value: ""}]);
      return;
    }
    onRowsChange(rows.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="block text-sm font-medium text-gray-700">{label}</legend>
      {hint ?
        <p className="text-xs text-gray-500">{hint}</p>
      : null}
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={row.label}
              onChange={(e) => updateRow(idx, {label: e.target.value})}
              placeholder={placeholderLabel}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
            <input
              type="text"
              value={row.value}
              onChange={(e) => updateRow(idx, {value: e.target.value})}
              placeholder={placeholderValue}
              className="min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none sm:w-28"
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
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
        onClick={addRow}
        className="mt-1 rounded-lg border border-dashed border-primary/40 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

type FeaturesFieldsetLabels = {
  sectionTitle: string;
  iconSvg: string;
  iconStyle: string;
  sectionContent: string;
  style1: string;
  style2: string;
  style3: string;
};

type FeaturesFieldsetProps = {
  legend: string;
  hint?: string;
  items: FeatureItemDraft[];
  onItemsChange: (next: FeatureItemDraft[]) => void;
  addLabel: string;
  removeLabel: string;
  labels: FeaturesFieldsetLabels;
};

function FeaturesFieldset({
  legend,
  hint,
  items,
  onItemsChange,
  addLabel,
  removeLabel,
  labels,
}: FeaturesFieldsetProps) {
  function updateItem(index: number, patch: Partial<FeatureItemDraft>) {
    const next = items.map((it, i) => (i === index ? {...it, ...patch} : it));
    onItemsChange(next);
  }
  function addItem() {
    onItemsChange([...items, emptyFeatureItem()]);
  }
  function removeItem(index: number) {
    if (items.length <= 1) {
      onItemsChange([emptyFeatureItem()]);
      return;
    }
    onItemsChange(items.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="space-y-3">
      <legend className="block text-sm font-medium text-gray-700">{legend}</legend>
      {hint ?
        <p className="text-xs text-gray-500">{hint}</p>
      : null}
      <div className="space-y-4">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3"
          >
            <label className="block text-xs font-medium text-gray-600">
              {labels.sectionTitle}
              <input
                type="text"
                value={it.sectionTitle}
                onChange={(e) =>
                  updateItem(idx, {sectionTitle: e.target.value})
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              {labels.iconSvg}
              <textarea
                rows={5}
                value={it.iconSvg}
                onChange={(e) => updateItem(idx, {iconSvg: e.target.value})}
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              {labels.iconStyle}
              <select
                value={it.iconStyle}
                onChange={(e) =>
                  updateItem(idx, {
                    iconStyle: normalizeIconStyle(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="1">{labels.style1}</option>
                <option value="2">{labels.style2}</option>
                <option value="3">{labels.style3}</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              {labels.sectionContent}
              <textarea
                rows={3}
                value={it.sectionContent}
                onChange={(e) =>
                  updateItem(idx, {sectionContent: e.target.value})
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-red-50 hover:text-red-700"
            >
              {removeLabel}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-1 rounded-lg border border-dashed border-primary/40 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

type FaqFieldsetLabels = {
  columnLegend: string;
  columnTitle: string;
  question: string;
  answer: string;
  addQuestion: string;
  removeQuestion: string;
  addColumn: string;
  removeColumn: string;
};

type FaqFieldsetProps = {
  hint?: string;
  columns: FaqColumnDraft[];
  onColumnsChange: (next: FaqColumnDraft[]) => void;
  labels: FaqFieldsetLabels;
};

function FaqFieldset({
  hint,
  columns,
  onColumnsChange,
  labels,
}: FaqFieldsetProps) {
  function updateColumn(index: number, patch: Partial<FaqColumnDraft>) {
    const next = columns.map((c, i) => (i === index ? {...c, ...patch} : c));
    onColumnsChange(next);
  }
  function updateItem(
    colIndex: number,
    itemIndex: number,
    patch: Partial<FaqItemDraft>,
  ) {
    const col = columns[colIndex];
    if (!col) return;
    const items = col.items.map((it, i) =>
      i === itemIndex ? {...it, ...patch} : it,
    );
    updateColumn(colIndex, {items});
  }
  function addItem(colIndex: number) {
    const col = columns[colIndex];
    if (!col) return;
    updateColumn(colIndex, {items: [...col.items, emptyFaqItem()]});
  }
  function removeItem(colIndex: number, itemIndex: number) {
    const col = columns[colIndex];
    if (!col) return;
    if (col.items.length <= 1) {
      updateColumn(colIndex, {items: [emptyFaqItem()]});
      return;
    }
    updateColumn(colIndex, {
      items: col.items.filter((_, i) => i !== itemIndex),
    });
  }
  function addColumn() {
    onColumnsChange([...columns, emptyFaqColumn()]);
  }
  function removeColumn(index: number) {
    if (columns.length <= 1) {
      onColumnsChange([emptyFaqColumn()]);
      return;
    }
    onColumnsChange(columns.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="space-y-4">
      <legend className="block text-sm font-medium text-gray-700">
        {labels.columnLegend}
      </legend>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      <div className="space-y-6">
        {columns.map((col, cIdx) => (
          <div
            key={cIdx}
            className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label className="block min-w-[200px] flex-1 text-xs font-medium text-gray-600">
                {labels.columnTitle} ({cIdx + 1})
                <input
                  type="text"
                  value={col.title}
                  onChange={(e) =>
                    updateColumn(cIdx, {title: e.target.value})
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => removeColumn(cIdx)}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-600 hover:bg-red-50 hover:text-red-700"
              >
                {labels.removeColumn}
              </button>
            </div>
            <div className="space-y-4 border-t border-gray-200/80 pt-3">
              {col.items.map((it, iIdx) => (
                <div
                  key={iIdx}
                  className="space-y-2 rounded-lg border border-gray-100 bg-white/90 p-3"
                >
                  <label className="block text-xs font-medium text-gray-600">
                    {labels.question}
                    <input
                      type="text"
                      value={it.question}
                      onChange={(e) =>
                        updateItem(cIdx, iIdx, {question: e.target.value})
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <div>
                    <span className="text-xs font-medium text-gray-600">
                      {labels.answer}
                    </span>
                    <div className="mt-1">
                      <ServiceLabelHtmlEditor
                        value={it.answer}
                        onChange={(html) =>
                          updateItem(cIdx, iIdx, {answer: html})
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(cIdx, iIdx)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {labels.removeQuestion}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem(cIdx)}
                className="rounded-lg border border-dashed border-primary/40 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
              >
                {labels.addQuestion}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addColumn}
        className="mt-1 rounded-lg border border-dashed border-primary/40 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
      >
        {labels.addColumn}
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
  const [activeCountries, setActiveCountries] = useState<CountryDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCountryCode, setActiveCountryCode] = useState(
    CMS_DEFAULT_COUNTRY_KEY,
  );
  const [activeLocaleCode, setActiveLocaleCode] = useState(
    editorLocale.trim().toLowerCase(),
  );

  const [siteDraftsByCountry, setSiteDraftsByCountry] = useState<
    Record<string, Record<string, SiteLocaleDraft>>
  >({});
  const [whyDraftsByCountry, setWhyDraftsByCountry] = useState<
    Record<string, Record<string, WhyLocaleDraft>>
  >({});
  const [blogDraftsByCountry, setBlogDraftsByCountry] = useState<
    Record<string, Record<string, BlogLocaleDraft>>
  >({});
  const [bannerDraftsByCountry, setBannerDraftsByCountry] = useState<
    Record<string, Record<string, BannerLocaleDraft>>
  >({});
  const [statsDraftsByCountry, setStatsDraftsByCountry] = useState<
    Record<string, Record<string, StatsLocaleDraft>>
  >({});
  const [featuresDraftsByCountry, setFeaturesDraftsByCountry] = useState<
    Record<string, Record<string, FeaturesLocaleDraft>>
  >({});
  const [faqDraftsByCountry, setFaqDraftsByCountry] = useState<
    Record<string, Record<string, FaqLocaleDraft>>
  >({});
  const [active, setActive] = useState(true);
  const [registrationActive, setRegistrationActive] = useState(false);
  const [videoImageUrl, setVideoImageUrl] = useState("");
  const [profileListingImageUrl, setProfileListingImageUrl] = useState("");
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

  const sortedCountryCodes = useMemo(() => {
    const codes = activeCountries
      .filter((c) => c.active)
      .map((c) => c.code.trim().toUpperCase().slice(0, 2))
      .filter(Boolean);
    const uniq = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
    return [
      CMS_DEFAULT_COUNTRY_KEY,
      ...uniq.filter((c) => c !== CMS_DEFAULT_COUNTRY_KEY),
    ];
  }, [activeCountries]);

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
      const [nsRes, secRes, countriesRes] = await Promise.all([
        adminFetch<ApiListResponse<CmsNamespaceDoc>>(
          `/admin/documents/cmsNamespaces?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<CmsSectionDoc>>(
          `/admin/documents/cmsSections?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
        adminFetch<ApiListResponse<CountryDoc>>(
          `/admin/documents/countries?sortLocale=${encodeURIComponent(editorLocale)}`,
          token,
        ),
      ]);
      setNamespaces((nsRes.data ?? []) as CmsNamespaceDoc[]);
      setSections((secRes.data ?? []) as CmsSectionDoc[]);
      setActiveCountries((countriesRes.data ?? []) as CountryDoc[]);
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
    setActiveCountryCode((prev) =>
      sortedCountryCodes.includes(prev) ? prev : CMS_DEFAULT_COUNTRY_KEY,
    );
  }, [sortedCountryCodes]);

  useEffect(() => {
    if (cType === "banner" && cSub === "why-choose-us") {
      setCSub("banner");
    }
    if (
      cType === "stat" &&
      (cSub === "why-choose-us" || cSub === "banner")
    ) {
      setCSub("stat");
    }
    if (
      cType === "features" &&
      (cSub === "why-choose-us" ||
        cSub === "banner" ||
        cSub === "stat" ||
        cSub === "faq")
    ) {
      setCSub("features");
    }
    if (
      cType === "faq" &&
      (cSub === "why-choose-us" ||
        cSub === "banner" ||
        cSub === "stat" ||
        cSub === "features" ||
        cSub === "blog-section" ||
        cSub === "profile-listing")
    ) {
      setCSub("faq");
    }
    if (
      cType === "profile_listing" &&
      (cSub === "why-choose-us" ||
        cSub === "banner" ||
        cSub === "stat" ||
        cSub === "features" ||
        cSub === "faq" ||
        cSub === "blog-section")
    ) {
      setCSub("profile-listing");
    }
  }, [cType, cSub]);

  useEffect(() => {
    if (!selected) {
      setSiteDraftsByCountry({});
      setWhyDraftsByCountry({});
      setBlogDraftsByCountry({});
      setBannerDraftsByCountry({});
      setStatsDraftsByCountry({});
      setFeaturesDraftsByCountry({});
      setFaqDraftsByCountry({});
      setAssignNamespaceId("");
      return;
    }
    const nextSite: Record<string, Record<string, SiteLocaleDraft>> = {};
    const nextWhy: Record<string, Record<string, WhyLocaleDraft>> = {};
    const nextBlog: Record<string, Record<string, BlogLocaleDraft>> = {};
    const nextBanner: Record<string, Record<string, BannerLocaleDraft>> = {};
    const nextStats: Record<string, Record<string, StatsLocaleDraft>> = {};
    const nextFeatures: Record<string, Record<string, FeaturesLocaleDraft>> =
      {};
    const nextFaq: Record<string, Record<string, FaqLocaleDraft>> = {};
    for (const country of sortedCountryCodes) {
      for (const code of sortedCodes) {
        const block = selected.translations?.[country]?.[code] as
          | Record<string, unknown>
          | undefined;
        if (!nextSite[country]) nextSite[country] = {};
        if (!nextWhy[country]) nextWhy[country] = {};
        if (!nextBlog[country]) nextBlog[country] = {};
        if (!nextBanner[country]) nextBanner[country] = {};
        if (!nextStats[country]) nextStats[country] = {};
        if (!nextFeatures[country]) nextFeatures[country] = {};
        if (!nextFaq[country]) nextFaq[country] = {};
        nextSite[country][code] = siteFromBlock(block);
        nextWhy[country][code] = whyFromBlock(block);
        nextBlog[country][code] = blogFromBlock(block);
        nextBanner[country][code] = bannerFromBlock(block);
        nextStats[country][code] = statsFromBlock(block);
        nextFeatures[country][code] = featuresFromBlock(block);
        nextFaq[country][code] = faqFromBlock(block);
      }
    }
    setSiteDraftsByCountry(nextSite);
    setWhyDraftsByCountry(nextWhy);
    setBlogDraftsByCountry(nextBlog);
    setBannerDraftsByCountry(nextBanner);
    setStatsDraftsByCountry(nextStats);
    setFeaturesDraftsByCountry(nextFeatures);
    setFaqDraftsByCountry(nextFaq);
    setActive(selected.active ?? true);
    setRegistrationActive(Boolean(selected.registrationActive));
    setVideoImageUrl(selected.videoImageUrl ?? "");
    setProfileListingImageUrl(selected.profileListingImageUrl ?? "");
    setVideoLink(selected.videoLink ?? "");
    setReadMoreUrl(selected.readMoreUrl ?? "");
    setAssignNamespaceId(selected.namespaceId ?? "");
  }, [selected, sortedCodes, sortedCountryCodes]);

  const patchWhy = useCallback(
    (fn: (d: WhyLocaleDraft) => WhyLocaleDraft) => {
      const c = activeCountryCode;
      const loc = activeLocaleCode;
      setWhyDraftsByCountry((p) => {
        const cur = p[c]?.[loc] ?? emptyWhy();
        return {
          ...p,
          [c]: {...(p[c] ?? {}), [loc]: fn(cur)},
        };
      });
    },
    [activeCountryCode, activeLocaleCode],
  );

  const patchSite = useCallback(
    (fn: (d: SiteLocaleDraft) => SiteLocaleDraft) => {
      const c = activeCountryCode;
      const loc = activeLocaleCode;
      setSiteDraftsByCountry((p) => {
        const cur = p[c]?.[loc] ?? emptySite();
        return {
          ...p,
          [c]: {...(p[c] ?? {}), [loc]: fn(cur)},
        };
      });
    },
    [activeCountryCode, activeLocaleCode],
  );

  const patchBlog = useCallback(
    (fn: (d: BlogLocaleDraft) => BlogLocaleDraft) => {
      const c = activeCountryCode;
      const loc = activeLocaleCode;
      setBlogDraftsByCountry((p) => {
        const cur = p[c]?.[loc] ?? emptyBlog();
        return {
          ...p,
          [c]: {...(p[c] ?? {}), [loc]: fn(cur)},
        };
      });
    },
    [activeCountryCode, activeLocaleCode],
  );

  const patchBanner = useCallback(
    (fn: (d: BannerLocaleDraft) => BannerLocaleDraft) => {
      const c = activeCountryCode;
      const loc = activeLocaleCode;
      setBannerDraftsByCountry((p) => {
        const cur = p[c]?.[loc] ?? emptyBanner();
        return {
          ...p,
          [c]: {...(p[c] ?? {}), [loc]: fn(cur)},
        };
      });
    },
    [activeCountryCode, activeLocaleCode],
  );

  const patchStats = useCallback(
    (fn: (d: StatsLocaleDraft) => StatsLocaleDraft) => {
      const c = activeCountryCode;
      const loc = activeLocaleCode;
      setStatsDraftsByCountry((p) => {
        const cur = p[c]?.[loc] ?? emptyStats();
        return {
          ...p,
          [c]: {...(p[c] ?? {}), [loc]: fn(cur)},
        };
      });
    },
    [activeCountryCode, activeLocaleCode],
  );

  const patchFeatures = useCallback(
    (fn: (d: FeaturesLocaleDraft) => FeaturesLocaleDraft) => {
      const c = activeCountryCode;
      const loc = activeLocaleCode;
      setFeaturesDraftsByCountry((p) => {
        const cur = p[c]?.[loc] ?? emptyFeatures();
        return {
          ...p,
          [c]: {...(p[c] ?? {}), [loc]: fn(cur)},
        };
      });
    },
    [activeCountryCode, activeLocaleCode],
  );

  const patchFaq = useCallback(
    (fn: (d: FaqLocaleDraft) => FaqLocaleDraft) => {
      const c = activeCountryCode;
      const loc = activeLocaleCode;
      setFaqDraftsByCountry((p) => {
        const cur = p[c]?.[loc] ?? emptyFaq();
        return {
          ...p,
          [c]: {...(p[c] ?? {}), [loc]: fn(cur)},
        };
      });
    },
    [activeCountryCode, activeLocaleCode],
  );

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

  const namespaceRelationOptions = useMemo(
    () =>
      namespaces.map((n) => {
        const display =
          labelForLocale(n.translations, editorLocale) ||
          pickSortLabel(n.translations, editorLocale, n.namespaceKey);
        return {
          value: n.id,
          label: `${n.namespaceKey} — ${display}`,
          hint: n.namespaceKey,
        };
      }),
    [namespaces, editorLocale],
  );

  async function saveSection() {
    if (!selected) return;
    if (sortedCodes.length === 0) {
      setLoadError(t("common.translationTabsNoLanguages"));
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    const kind = inferCmsSectionType(selected);
    const filledPairs: {country: string; locale: string}[] = [];
    for (const country of sortedCountryCodes) {
      for (const code of sortedCodes) {
        if (kind === "why_choose_us") {
          if (filledWhy(whyDraftsByCountry[country]?.[code] ?? emptyWhy())) {
            filledPairs.push({country, locale: code});
          }
        } else if (kind === "blog_section" || kind === "profile_listing") {
          if (filledBlog(blogDraftsByCountry[country]?.[code] ?? emptyBlog())) {
            filledPairs.push({country, locale: code});
          }
        } else if (kind === "banner") {
          if (filledBanner(bannerDraftsByCountry[country]?.[code] ?? emptyBanner())) {
            filledPairs.push({country, locale: code});
          }
        } else if (kind === "stat") {
          if (filledStats(statsDraftsByCountry[country]?.[code] ?? emptyStats())) {
            filledPairs.push({country, locale: code});
          }
        } else if (kind === "features") {
          if (
            filledFeatures(
              featuresDraftsByCountry[country]?.[code] ?? emptyFeatures(),
            )
          ) {
            filledPairs.push({country, locale: code});
          }
        } else if (kind === "faq") {
          if (filledFaq(faqDraftsByCountry[country]?.[code] ?? emptyFaq())) {
            filledPairs.push({country, locale: code});
          }
        } else if (filledSite(siteDraftsByCountry[country]?.[code] ?? emptySite())) {
          filledPairs.push({country, locale: code});
        }
      }
    }
    if (filledPairs.length === 0) {
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
            profileListingImageUrl,
            videoLink,
            readMoreUrl,
          }),
        },
      );

      for (const {country, locale: code} of filledPairs) {
        const body: Record<string, unknown> = {
          locale: code,
          countryCode: country,
        };
        if (kind === "why_choose_us") {
          const d = whyDraftsByCountry[country]?.[code] ?? emptyWhy();
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
        } else if (kind === "blog_section" || kind === "profile_listing") {
          const d = blogDraftsByCountry[country]?.[code] ?? emptyBlog();
          Object.assign(body, {
            name: d.name.trim(),
            description: d.description,
          });
          if (!d.name.trim()) {
            setLoadError(t("cms.errorNeedTranslation"));
            setSaving(false);
            return;
          }
        } else if (kind === "banner") {
          const d = bannerDraftsByCountry[country]?.[code] ?? emptyBanner();
          if (!d.name.trim()) {
            setLoadError(t("cms.banner.errorNeedTitle"));
            setSaving(false);
            return;
          }
          Object.assign(body, {
            name: d.name.trim(),
            bannerAvatarLinks: linesToStored(d.bannerAvatarLinks),
            bannerAverageRating: d.bannerAverageRating,
            bannerTrustCount: d.bannerTrustCount,
            bannerTrustLabel: d.bannerTrustLabel,
          });
        } else if (kind === "stat") {
          const d = statsDraftsByCountry[country]?.[code] ?? emptyStats();
          if (!d.name.trim()) {
            setLoadError(t("cms.stat.errorNeedTitle"));
            setSaving(false);
            return;
          }
          Object.assign(body, {
            name: d.name.trim(),
            statRows: statRowsToStored(d.statRows),
          });
        } else if (kind === "features") {
          const d = featuresDraftsByCountry[country]?.[code] ?? emptyFeatures();
          if (!d.name.trim()) {
            setLoadError(t("cms.features.errorNeedTitle"));
            setSaving(false);
            return;
          }
          Object.assign(body, {
            name: d.name.trim(),
            featureItems: featuresToStored(d.items),
          });
        } else if (kind === "faq") {
          const d = faqDraftsByCountry[country]?.[code] ?? emptyFaq();
          if (!d.name.trim()) {
            setLoadError(t("cms.faq.errorNeedTitle"));
            setSaving(false);
            return;
          }
          Object.assign(body, {
            name: d.name.trim(),
            faqSections: faqToStored(d.columns),
          });
        } else {
          const d = siteDraftsByCountry[country]?.[code] ?? emptySite();
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
            countryCode: CMS_DEFAULT_COUNTRY_KEY,
            name: cTitle.trim(),
            sectionKey: ns.namespaceKey,
            subsectionKey: cSub.trim().toLowerCase().replace(/\s+/g, "-"),
            namespaceId: ns.id,
            sectionType: cType,
            active: true,
            registrationActive: false,
            videoImageUrl: "",
            profileListingImageUrl: "",
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

  const currentSite =
    siteDraftsByCountry[activeCountryCode]?.[activeLocaleCode] ?? emptySite();
  const currentWhy =
    whyDraftsByCountry[activeCountryCode]?.[activeLocaleCode] ?? emptyWhy();
  const currentBlog =
    blogDraftsByCountry[activeCountryCode]?.[activeLocaleCode] ?? emptyBlog();
  const currentBanner =
    bannerDraftsByCountry[activeCountryCode]?.[activeLocaleCode] ??
    emptyBanner();
  const currentStats =
    statsDraftsByCountry[activeCountryCode]?.[activeLocaleCode] ??
    emptyStats();
  const currentFeatures =
    featuresDraftsByCountry[activeCountryCode]?.[activeLocaleCode] ??
    emptyFeatures();
  const currentFaq =
    faqDraftsByCountry[activeCountryCode]?.[activeLocaleCode] ?? emptyFaq();
  const hasLocales = sortedCodes.length > 0;

  function tabFilledLocale(code: string): boolean {
    if (!selected) return false;
    const k = inferCmsSectionType(selected);
    const c = activeCountryCode;
    if (k === "why_choose_us") {
      return filledWhy(whyDraftsByCountry[c]?.[code] ?? emptyWhy());
    }
    if (k === "blog_section" || k === "profile_listing") {
      return filledBlog(blogDraftsByCountry[c]?.[code] ?? emptyBlog());
    }
    if (k === "banner") {
      return filledBanner(bannerDraftsByCountry[c]?.[code] ?? emptyBanner());
    }
    if (k === "stat") {
      return filledStats(statsDraftsByCountry[c]?.[code] ?? emptyStats());
    }
    if (k === "features") {
      return filledFeatures(
        featuresDraftsByCountry[c]?.[code] ?? emptyFeatures(),
      );
    }
    if (k === "faq") {
      return filledFaq(faqDraftsByCountry[c]?.[code] ?? emptyFaq());
    }
    return filledSite(siteDraftsByCountry[c]?.[code] ?? emptySite());
  }

  function tabFilledCountry(cc: string): boolean {
    if (!selected) return false;
    const k = inferCmsSectionType(selected);
    return sortedCodes.some((loc) => {
      if (k === "why_choose_us") {
        return filledWhy(whyDraftsByCountry[cc]?.[loc] ?? emptyWhy());
      }
      if (k === "blog_section" || k === "profile_listing") {
        return filledBlog(blogDraftsByCountry[cc]?.[loc] ?? emptyBlog());
      }
      if (k === "banner") {
        return filledBanner(bannerDraftsByCountry[cc]?.[loc] ?? emptyBanner());
      }
      if (k === "stat") {
        return filledStats(statsDraftsByCountry[cc]?.[loc] ?? emptyStats());
      }
      if (k === "features") {
        return filledFeatures(
          featuresDraftsByCountry[cc]?.[loc] ?? emptyFeatures(),
        );
      }
      if (k === "faq") {
        return filledFaq(faqDraftsByCountry[cc]?.[loc] ?? emptyFaq());
      }
      return filledSite(siteDraftsByCountry[cc]?.[loc] ?? emptySite());
    });
  }

  function countryTabLabel(cc: string): string {
    if (cc === CMS_DEFAULT_COUNTRY_KEY) return t("cms.countryTab.default");
    const doc = activeCountries.find(
      (x) => x.code.trim().toUpperCase().slice(0, 2) === cc,
    );
    const name =
      labelForLocale(doc?.translations, editorLocale) ||
      pickSortLabel(doc?.translations, editorLocale, cc);
    return name ? `${cc} — ${name}` : cc;
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
                <SearchableRelationSelect
                  value={cNs}
                  onChange={setCNs}
                  options={namespaceRelationOptions}
                  emptyOptionLabel={t("cms.section.namespacePlaceholder")}
                  disabled={saving}
                />
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
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-4 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            {t("cms.menuTitle")}
          </p>
          {namespaces.length === 0 ?
            <p className="px-1 text-sm text-amber-800">{t("cms.noNamespacesHint")}</p>
          : null}
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            {namespaces.map((ns, nsIndex) => {
              const list = grouped.byNs.get(ns.id) ?? [];
              return (
                <div
                  key={ns.id}
                  className={
                    nsIndex < namespaces.length - 1 || grouped.orphan.length > 0 ?
                      "border-b border-gray-200 pb-6"
                    : ""
                  }
                >
                  <p className="mb-3 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    {labelForLocale(ns.translations, editorLocale) ||
                      ns.namespaceKey}
                  </p>
                  {list.length === 0 ?
                    <p className="px-1 text-sm text-gray-400">
                      {t("cms.section.noSectionsInNamespace")}
                    </p>
                  : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60">
                      <div className="divide-y divide-gray-200">
                        {list.map((s) => {
                          const sel = selectedId === s.id;
                          const kind = inferCmsSectionType(s);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedId(s.id)}
                              className={`flex w-full flex-col px-3 py-3.5 text-left text-sm transition-colors ${
                                sel ?
                                  "bg-primary/12 font-medium text-primary"
                                : "text-gray-700 hover:bg-white"
                              }`}
                            >
                              <span className="truncate">
                                {pickSortLabelCms(
                                  s.translations,
                                  editorLocale,
                                  s.subsectionKey,
                                )}
                              </span>
                              <span className="mt-1 truncate text-[11px] text-gray-400">
                                {t(
                                  SECTION_TYPES.find((x) => x.id === kind)
                                    ?.labelKey ?? "cms.sectionType.siteSettings",
                                )}{" "}
                                · {s.subsectionKey}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {grouped.orphan.length > 0 ?
              <div className="pt-1">
                <p className="mb-3 px-1 text-xs font-semibold tracking-wide text-amber-700 uppercase">
                  {t("cms.section.unassigned")}
                </p>
                <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/40">
                  <div className="divide-y divide-amber-200/70">
                    {grouped.orphan.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className={`w-full px-3 py-3.5 text-left text-sm transition-colors ${
                          selectedId === s.id ?
                            "bg-primary/12 font-medium text-primary"
                          : "text-gray-700 hover:bg-white/80"
                        }`}
                      >
                        {pickSortLabelCms(
                          s.translations,
                          editorLocale,
                          s.subsectionKey,
                        )}
                      </button>
                    ))}
                  </div>
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
                    {pickSortLabelCms(
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
                <div className="mt-1 max-w-md">
                  <SearchableRelationSelect
                    value={assignNamespaceId}
                    onChange={setAssignNamespaceId}
                    options={namespaceRelationOptions}
                    emptyOptionLabel={t("cms.section.unassignedOption")}
                    disabled={saving}
                  />
                </div>
              </label>

              <p className="mb-1 text-xs font-medium text-gray-600">
                {t("cms.countryTabsLabel")}
              </p>
              <div className="mb-3 flex flex-wrap gap-1 border-b border-gray-200 pb-2">
                {sortedCountryCodes.map((cc) => {
                  const selectedCountry = cc === activeCountryCode;
                  return (
                    <button
                      key={cc}
                      type="button"
                      onClick={() => setActiveCountryCode(cc)}
                      className={`max-w-full truncate rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        selectedCountry ?
                          "bg-slate-800 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      } ${tabFilledCountry(cc) ? "ring-1 ring-inset ring-emerald-300/80" : ""}`}
                      title={cc}
                    >
                      {countryTabLabel(cc)}
                    </button>
                  );
                })}
              </div>

              <p className="mb-1 text-xs font-medium text-gray-600">
                {t("common.locales")}
              </p>
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
                      } ${tabFilledLocale(code) ? "ring-1 ring-inset ring-emerald-300/80" : ""}`}
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
                    <CmsVideoThumbnailField
                      value={videoImageUrl}
                      onChange={setVideoImageUrl}
                      sectionId={selectedId ?? undefined}
                      disabled={saving}
                    />
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
                        patchWhy((cur) => ({...cur, name: e.target.value}))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldSection1Title")}
                    <input
                      value={currentWhy.section1Title}
                      onChange={(e) =>
                        patchWhy((cur) => ({
                          ...cur,
                          section1Title: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <WhyBulletFieldset
                    label={t("cms.why.fieldSection1Items")}
                    items={currentWhy.section1Items}
                    onItemsChange={(next) =>
                      patchWhy((cur) => ({...cur, section1Items: next}))
                    }
                    addLabel={t("cms.why.addBullet")}
                    removeLabel={t("cms.why.removeBullet")}
                  />
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldSection2Title")}
                    <input
                      value={currentWhy.section2Title}
                      onChange={(e) =>
                        patchWhy((cur) => ({
                          ...cur,
                          section2Title: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <WhyBulletFieldset
                    label={t("cms.why.fieldSection2Items")}
                    items={currentWhy.section2Items}
                    onItemsChange={(next) =>
                      patchWhy((cur) => ({...cur, section2Items: next}))
                    }
                    addLabel={t("cms.why.addBullet")}
                    removeLabel={t("cms.why.removeBullet")}
                  />
                  <label className="block text-sm text-gray-700">
                    {t("cms.why.fieldReadMoreLabel")}
                    <input
                      value={currentWhy.readMoreLabel}
                      onChange={(e) =>
                        patchWhy((cur) => ({
                          ...cur,
                          readMoreLabel: e.target.value,
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
              : sectionKind === "blog_section" ||
                  sectionKind === "profile_listing" ?
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm text-gray-700">
                    {(sectionKind === "profile_listing" ?
                      t("cms.profileListing.fieldTitle")
                    : t("common.name"))}{" "}
                    *
                    <input
                      value={currentBlog.name}
                      onChange={(e) =>
                        patchBlog((cur) => ({...cur, name: e.target.value}))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700 md:col-span-2">
                    {sectionKind === "profile_listing" ?
                      t("cms.profileListing.fieldSubtitle")
                    : t("common.description")}
                    <textarea
                      rows={3}
                      value={currentBlog.description}
                      onChange={(e) =>
                        patchBlog((cur) => ({
                          ...cur,
                          description: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  {sectionKind === "profile_listing" ?
                    <CmsVideoThumbnailField
                      label={t("cms.profileListing.fieldImage")}
                      value={profileListingImageUrl}
                      onChange={setProfileListingImageUrl}
                      sectionId={selectedId ?? undefined}
                      disabled={saving}
                    />
                  : null}
                </div>
              : sectionKind === "stat" ?
                <div className="space-y-4">
                  <label className="block text-sm text-gray-700">
                    {t("cms.stat.fieldTitle")} *
                    <input
                      value={currentStats.name}
                      onChange={(e) =>
                        patchStats((cur) => ({...cur, name: e.target.value}))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <StatKpiFieldset
                    label={t("cms.stat.fieldStats")}
                    hint={t("cms.stat.rowHint")}
                    rows={currentStats.statRows}
                    onRowsChange={(next) =>
                      patchStats((cur) => ({...cur, statRows: next}))
                    }
                    addLabel={t("cms.stat.addStat")}
                    removeLabel={t("cms.stat.removeStat")}
                    placeholderLabel={t("cms.stat.statTitle")}
                    placeholderValue={t("cms.stat.value")}
                  />
                </div>
              : sectionKind === "features" ?
                <div className="space-y-4">
                  <label className="block text-sm text-gray-700">
                    {t("cms.features.fieldTitle")} *
                    <input
                      value={currentFeatures.name}
                      onChange={(e) =>
                        patchFeatures((cur) => ({
                          ...cur,
                          name: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <FeaturesFieldset
                    legend={t("cms.features.fieldSections")}
                    hint={t("cms.features.sectionsHint")}
                    items={currentFeatures.items}
                    onItemsChange={(next) =>
                      patchFeatures((cur) => ({...cur, items: next}))
                    }
                    addLabel={t("cms.features.addSection")}
                    removeLabel={t("cms.features.removeSection")}
                    labels={{
                      sectionTitle: t("cms.features.sectionTitle"),
                      iconSvg: t("cms.features.iconSvg"),
                      iconStyle: t("cms.features.iconStyle"),
                      sectionContent: t("cms.features.sectionContent"),
                      style1: t("cms.features.iconStyle1"),
                      style2: t("cms.features.iconStyle2"),
                      style3: t("cms.features.iconStyle3"),
                    }}
                  />
                </div>
              : sectionKind === "faq" ?
                <div className="space-y-4">
                  <label className="block text-sm text-gray-700">
                    {t("cms.faq.fieldMainTitle")} *
                    <input
                      value={currentFaq.name}
                      onChange={(e) =>
                        patchFaq((cur) => ({...cur, name: e.target.value}))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <FaqFieldset
                    hint={t("cms.faq.sectionsHint")}
                    columns={currentFaq.columns}
                    onColumnsChange={(next) =>
                      patchFaq((cur) => ({...cur, columns: next}))
                    }
                    labels={{
                      columnLegend: t("cms.faq.fieldColumns"),
                      columnTitle: t("cms.faq.columnTitle"),
                      question: t("cms.faq.question"),
                      answer: t("cms.faq.answer"),
                      addQuestion: t("cms.faq.addQuestion"),
                      removeQuestion: t("cms.faq.removeQuestion"),
                      addColumn: t("cms.faq.addColumn"),
                      removeColumn: t("cms.faq.removeColumn"),
                    }}
                  />
                </div>
              : sectionKind === "banner" ?
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    {t("cms.banner.avatarLinksHint")}
                  </p>
                  <label className="block text-sm text-gray-700">
                    {t("cms.banner.fieldTitle")} *
                    <input
                      value={currentBanner.name}
                      onChange={(e) =>
                        patchBanner((cur) => ({...cur, name: e.target.value}))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <WhyBulletFieldset
                    label={t("cms.banner.fieldAvatarLinks")}
                    items={currentBanner.bannerAvatarLinks}
                    onItemsChange={(next) =>
                      patchBanner((cur) => ({
                        ...cur,
                        bannerAvatarLinks: next,
                      }))
                    }
                    addLabel={t("cms.banner.addAvatarUrl")}
                    removeLabel={t("cms.banner.removeAvatarUrl")}
                  />
                  <label className="block text-sm text-gray-700">
                    {t("cms.banner.fieldAverageRating")}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      ({t("cms.banner.fieldAverageRatingHint")})
                    </span>
                    <input
                      value={currentBanner.bannerAverageRating}
                      onChange={(e) =>
                        patchBanner((cur) => ({
                          ...cur,
                          bannerAverageRating: e.target.value,
                        }))
                      }
                      inputMode="decimal"
                      className="mt-1 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.banner.fieldTrustCount")}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      ({t("cms.banner.fieldTrustCountHint")})
                    </span>
                    <input
                      value={currentBanner.bannerTrustCount}
                      onChange={(e) =>
                        patchBanner((cur) => ({
                          ...cur,
                          bannerTrustCount: e.target.value,
                        }))
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("cms.banner.fieldTrustLabel")}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      ({t("cms.banner.fieldTrustLabelHint")})
                    </span>
                    <input
                      value={currentBanner.bannerTrustLabel}
                      onChange={(e) =>
                        patchBanner((cur) => ({
                          ...cur,
                          bannerTrustLabel: e.target.value,
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
                        patchSite((cur) => ({...cur, name: e.target.value}))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm text-gray-700">
                    {t("common.description")}
                    <input
                      value={currentSite.description}
                      onChange={(e) =>
                        patchSite((cur) => ({
                          ...cur,
                          description: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          metaKeyword: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          metaAuthor: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          metaDescription: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          facebookLink: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          twitterLink: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          linkedinLink: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          skypeLink: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          instagramLink: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          youtubeLink: e.target.value,
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
                        patchSite((cur) => ({
                          ...cur,
                          footerLeftText: e.target.value,
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
