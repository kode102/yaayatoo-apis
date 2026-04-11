"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";

export default function CmsBlogArticlesView() {
  const {t} = useUiLocale();
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900">
        {t("cms.blogNews.articles.title")}
      </h1>
      <p className="text-sm text-gray-500">{t("cms.blogNews.articles.subtitle")}</p>
      <p className="text-sm text-gray-600">{t("cms.blogNews.articles.placeholder")}</p>
    </div>
  );
}
