"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import AdminShell from "@/components/admin-shell";

export default function Protected({children}: {children: React.ReactNode}) {
  const {user, loading} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        {t("common.redirecting")}
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
