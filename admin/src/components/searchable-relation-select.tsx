"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {useUiLocale} from "@/contexts/ui-locale-context";

export type RelationSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: RelationSelectOption[];
  /** Libellé quand aucune valeur (entrée vide). */
  emptyOptionLabel?: string;
  disabled?: boolean;
};

function matches(opt: RelationSelectOption, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (opt.label.toLowerCase().includes(s)) return true;
  if (opt.value.toLowerCase().includes(s)) return true;
  const h = opt.hint?.trim().toLowerCase() ?? "";
  return h.includes(s);
}

/**
 * Sélecteur de relation Firestore avec recherche textuelle dans la liste.
 */
export function SearchableRelationSelect({
  value,
  onChange,
  options,
  emptyOptionLabel,
  disabled,
}: Props) {
  const {t} = useUiLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filtered = useMemo(
    () => options.filter((o) => matches(o, search)),
    [options, search],
  );

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
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

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setSearch("");
  }

  const showEmpty = Boolean(emptyOptionLabel?.trim());

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
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate">
          {!value.trim() && emptyOptionLabel ?
            <span className="text-gray-500">{emptyOptionLabel}</span>
          : selected ?
            <>
              <span className="block truncate font-medium text-gray-900">
                {selected.label}
              </span>
              {selected.hint?.trim() && selected.hint !== selected.label ?
                <span className="mt-0.5 block truncate font-mono text-xs text-gray-500">
                  {selected.hint}
                </span>
              : null}
            </>
          : value.trim() ?
            <>
              <span className="block truncate font-medium text-gray-900">
                {value}
              </span>
              <span className="mt-0.5 block truncate text-xs text-amber-700">
                {t("relationSelect.unknownId")}
              </span>
            </>
          : <span className="text-gray-500">{emptyOptionLabel ?? "—"}</span>
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
              placeholder={t("relationSelect.searchPlaceholder")}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
              autoComplete="off"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto px-1">
            {showEmpty ?
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value.trim()}
                  onClick={() => pick("")}
                  className={`flex w-full flex-col items-start rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50 ${
                    !value.trim() ? "bg-primary/8" : ""
                  }`}
                >
                  <span className="text-gray-600">{emptyOptionLabel}</span>
                </button>
              </li>
            : null}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => pick(o.value)}
                  className={`flex w-full flex-col items-start rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50 ${
                    o.value === value ? "bg-primary/8" : ""
                  }`}
                >
                  <span className="font-medium text-gray-900">{o.label}</span>
                  {o.hint?.trim() && o.hint !== o.label ?
                    <span className="break-all font-mono text-xs text-gray-500">
                      {o.hint}
                    </span>
                  : null}
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 ?
            <p className="px-3 py-2 text-xs text-gray-500">
              {t("relationSelect.noResults")}
            </p>
          : null}
        </div>
      : null}
    </div>
  );
}
