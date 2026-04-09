"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function CmsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cms/sections");
  }, [router]);
  return <div className="text-sm text-gray-500">Redirection…</div>;
}
