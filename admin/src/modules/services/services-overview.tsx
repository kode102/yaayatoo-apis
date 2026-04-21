"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";

const CARD_KEYS = [
  "services.overview.card.views",
  "services.overview.card.engagements",
  "services.overview.card.statistics",
  "services.overview.card.revenues",
  "services.overview.card.offers",
] as const;

export default function ServicesOverviewView() {
  const {t} = useUiLocale();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("services.overview.title")}
        </h1>
        <p className="max-w-3xl text-sm text-gray-600">
          {t("services.overview.subtitle")}
        </p>
        <p className="max-w-3xl text-sm text-gray-500">
          {t("services.overview.placeholderIntro")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-5"
          >
            <h2 className="text-sm font-semibold text-gray-800">{t(key)}</h2>
            <p className="mt-2 text-xs text-gray-500">{t("services.overview.cardPlaceholder")}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          {t("services.overview.chartsTitle")}
        </h2>
        <p className="mt-2 text-sm text-gray-500">{t("services.overview.chartsHint")}</p>
        <div className="mt-6 flex min-h-[200px] items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          {t("services.overview.chartsArea")}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          {t("services.overview.tablesTitle")}
        </h2>
        <p className="mt-2 text-sm text-gray-500">{t("services.overview.tablesHint")}</p>
        <div className="mt-6 flex min-h-[160px] items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          {t("services.overview.tablesArea")}
        </div>
      </div>
    </div>
  );
}
