"use client";

import {useEffect, useMemo, useState} from "react";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {labelForLocale, type LanguageDoc, type LocaleTextDraft} from "@/lib/i18n-types";

function tabLabel(lang: LanguageDoc, editorLocale: string): string {
  const n = labelForLocale(lang.translations, editorLocale).trim();
  return n || lang.code.trim().toUpperCase();
}

type Props = {
  activeLanguages: LanguageDoc[];
  editorLocale: string;
  drafts: Record<string, LocaleTextDraft>;
  onDraftChange: (code: string, next: LocaleTextDraft) => void;
  showDescription: boolean;
  nameLabel: string;
  descriptionLabel: string;
};

export function TranslationLocaleTabs({
  activeLanguages,
  editorLocale,
  drafts,
  onDraftChange,
  showDescription,
  nameLabel,
  descriptionLabel,
}: Props) {
  const {t} = useUiLocale();
  const sorted = useMemo(
    () =>
      [...activeLanguages].sort((a, b) =>
        a.code.trim().toLowerCase().localeCompare(b.code.trim().toLowerCase()),
      ),
    [activeLanguages],
  );

  const defaultTab =
    sorted.find(
      (l) => l.code.trim().toLowerCase() === editorLocale.trim().toLowerCase(),
    )?.code ??
    sorted[0]?.code ??
    "";

  const [activeCode, setActiveCode] = useState(defaultTab.trim().toLowerCase());

  useEffect(() => {
    const next = defaultTab.trim().toLowerCase();
    if (next && sorted.some((l) => l.code.trim().toLowerCase() === next)) {
      setActiveCode(next);
    }
  }, [defaultTab, sorted]);

  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {t("common.translationTabsNoLanguages")}
      </p>
    );
  }

  const current = drafts[activeCode] ?? {name: "", description: ""};
  const activeLang = sorted.find(
    (l) => l.code.trim().toLowerCase() === activeCode,
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{t("common.translationTabsHint")}</p>
      <div
        role="tablist"
        aria-label={t("common.translationTabsAria")}
        className="flex flex-wrap gap-1 border-b border-gray-200 pb-1"
      >
        {sorted.map((lang) => {
          const code = lang.code.trim().toLowerCase();
          const selected = code === activeCode;
          const filled = Boolean(drafts[code]?.name?.trim());
          return (
            <button
              key={lang.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`rounded-t-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                selected ?
                  "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${filled ? "ring-1 ring-inset ring-emerald-300/80" : ""}`}
              onClick={() => setActiveCode(code)}
            >
              {tabLabel(lang, editorLocale)}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        className="space-y-3 pt-1"
        aria-label={
          activeLang ? tabLabel(activeLang, editorLocale) : activeCode
        }
      >
        <label className="block text-sm text-gray-700">
          {nameLabel}{" "}
          <span className="font-normal text-gray-400">({activeCode})</span>
          <input
            value={current.name}
            onChange={(e) =>
              onDraftChange(activeCode, {
                ...current,
                name: e.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
        </label>
        {showDescription ?
          <label className="block text-sm text-gray-700">
            {descriptionLabel}
            <textarea
              value={current.description}
              onChange={(e) =>
                onDraftChange(activeCode, {
                  ...current,
                  description: e.target.value,
                })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </label>
        : null}
      </div>
    </div>
  );
}
