"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function UsersIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/users/list");
  }, [router]);
  return (
    <div className="text-sm text-gray-500">{/* redirection */}</div>
  );
}
