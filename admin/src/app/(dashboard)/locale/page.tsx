"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useUiLocale} from "@/contexts/ui-locale-context";

export default function LocaleIndexPage() {
  const router = useRouter();
  const {t} = useUiLocale();
  useEffect(() => {
    router.replace("/locale/dictionary");
  }, [router]);
  return (
    <div className="text-sm text-gray-500">{t("common.redirecting")}</div>
  );
}
