"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/contexts/auth-context";
import AdminShell from "@/components/admin-shell";

export default function Protected({children}: {children: React.ReactNode}) {
  const {user, loading} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Redirection…
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
