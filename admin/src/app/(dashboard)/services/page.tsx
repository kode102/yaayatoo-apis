"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function ServicesIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/services/list");
  }, [router]);
  return (
    <div className="text-sm text-gray-500">Redirection…</div>
  );
}
