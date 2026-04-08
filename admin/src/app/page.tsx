"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";

export default function HomePage() {
  const {user, loading} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/services/list");
    else router.replace("/login");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
      {t("common.loading")}
    </div>
  );
}
