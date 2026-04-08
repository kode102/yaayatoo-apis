"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function LanguagesIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/languages/list");
  }, [router]);
  return (
    <div className="text-sm text-gray-500">Redirection…</div>
  );
}
