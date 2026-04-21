"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";

export default function JobContractsView() {
  const {t} = useUiLocale();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("jobs.contracts.title")}
        </h1>
        <p className="text-sm text-gray-600">{t("jobs.contracts.subtitle")}</p>
      </div>
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-sm text-gray-500">
        {t("jobs.contracts.placeholder")}
      </div>
    </div>
  );
}
