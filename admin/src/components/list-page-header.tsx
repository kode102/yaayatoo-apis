"use client";

import Link from "next/link";
import type {ReactNode} from "react";
import {useUiLocale} from "@/contexts/ui-locale-context";

type Props = {
  title: string;
  subtitle?: string;
  createHref: string;
  /** Contenu sous le sous-titre (ex. lien dictionnaire). */
  extra?: ReactNode;
};

export function ListPageHeader({title, subtitle, createHref, extra}: Props) {
  const {t} = useUiLocale();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle ?
          <p className="text-sm text-gray-500">{subtitle}</p>
        : null}
        {extra}
      </div>
      <Link
        href={createHref}
        className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover sm:w-auto"
      >
        {t("nav.action.create")}
      </Link>
    </div>
  );
}
