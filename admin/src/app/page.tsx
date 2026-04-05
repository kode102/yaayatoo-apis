"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/contexts/auth-context";

export default function HomePage() {
  const {user, loading} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/services");
    else router.replace("/login");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
      Chargement…
    </div>
  );
}
