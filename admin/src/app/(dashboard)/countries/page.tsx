"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function CountriesIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/countries/list");
  }, [router]);
  return (
    <div className="text-sm text-gray-500">Redirection…</div>
  );
}
