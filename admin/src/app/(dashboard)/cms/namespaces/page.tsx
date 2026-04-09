"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function CmsNamespacesIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cms/namespaces/list");
  }, [router]);
  return <div className="text-sm text-gray-500">{/* redirect */}</div>;
}
