"use client";

import {useState} from "react";
import AdminSidebar from "@/components/admin-sidebar";
import AdminTopbar from "@/components/admin-topbar";

export default function AdminShell({children}: {children: React.ReactNode}) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <AdminSidebar
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setMobileNav(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
