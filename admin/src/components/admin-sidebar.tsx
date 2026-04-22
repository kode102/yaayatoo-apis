"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {ADMIN_NAV_MODULES, type AdminNavItem} from "@/config/admin-nav";
import {useUiLocale} from "@/contexts/ui-locale-context";

type Props = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function ModuleIcon({id}: {id: string}) {
  const cls = "h-5 w-5 shrink-0";
  switch (id) {
    case "services":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M20.25 14.15v4.25c0 1.232-.92 2.25-2.1 2.43a48.32 48.32 0 0 1-7.9 0c-1.18-.18-2.1-1.198-2.1-2.43v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.67V8.952c0-1.091-.78-2.013-1.86-2.168l-6.75-1.05c-.27-.042-.55-.042-.82 0l-6.75 1.05A2.25 2.25 0 0 0 3.75 8.952v3.828c0 .65.32 1.26.86 1.67m16.5 0A2.25 2.25 0 0 1 18 18.75h-7.5A2.25 2.25 0 0 1 8.25 16.5v-5.25"
          />
        </svg>
      );
    case "i18n":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
      );
    case "job":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
          />
        </svg>
      );
    case "cms":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3.75 5.25A2.25 2.25 0 0 1 6 3h12a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 18 21H6a2.25 2.25 0 0 1-2.25-2.25V5.25ZM8.25 7.5h7.5m-7.5 4.5h7.5m-7.5 4.5h4.5"
          />
        </svg>
      );
    case "users":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.48-2.897M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      );
    case "helpDesk":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M21.75 9v.75a2.25 2.25 0 0 1-2.25 2.25h-5.379l-2.629 2.628a.75.75 0 0 1-1.28-.53V12h-2.25A2.25 2.25 0 0 1 5.25 9.75V5.25A2.25 2.25 0 0 1 7.5 3h12a2.25 2.25 0 0 1 2.25 2.25V9ZM12.53 19.28l-1.061-1.06 2.122-2.122H18a2.25 2.25 0 0 0 2.25-2.25v-1.5h1.5v1.5a3.75 3.75 0 0 1-3.75 3.75h-4.189l-.281.282Z"
          />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}

export default function AdminSidebar({mobileOpen, onCloseMobile}: Props) {
  const pathname = usePathname();
  const {t} = useUiLocale();

  const normalizePath = (p: string) => (p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p);

  const linkActive = (item: AdminNavItem) => {
    if (!pathname) return false;
    const cur = normalizePath(pathname);
    const href = normalizePath(item.href);
    if (cur === href) return true;
    return (
      item.activeHrefPrefixes?.some((prefix) => {
        const pre = normalizePath(prefix);
        return cur === pre || cur.startsWith(`${pre}/`);
      }) ?? false
    );
  };

  const linkCls = (item: AdminNavItem) => {
    const active = linkActive(item);
    return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
      active ?
        "bg-primary/10 font-medium text-secondary shadow-sm shadow-primary/12"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;
  };

  const aside = (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-gray-100 bg-white shadow-sm lg:static lg:z-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } transition-transform duration-200 ease-out lg:transition-none`}
    >
      <div className="flex h-[73px] items-center border-b border-gray-100 px-5">
        <Link
          href="/services/overview"
          className="flex min-w-0 items-center"
          onClick={onCloseMobile}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- asset statique /icon.svg */}
          <img
            src="/icon.svg"
            alt="Yaayatoo"
            width={108}
            height={32}
            className="h-8 w-auto max-w-full object-contain object-left"
          />
        </Link>
      </div>
      <nav className="max-h-[calc(100vh-73px)] flex-1 overflow-y-auto p-4">
        <p className="mb-3 px-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
          {t("nav.menu")}
        </p>
        <ul className="space-y-5">
          {ADMIN_NAV_MODULES.map((mod) => {
            const moduleActive =
              (pathname?.startsWith(mod.pathPrefix) ?? false) ||
              (mod.activePathPrefixes?.some((p) => pathname?.startsWith(p)) ??
                false);
            return (
              <li key={mod.id}>
                <div
                  className={`mb-2 flex items-center gap-2 px-2 text-xs font-semibold tracking-wide uppercase ${
                    moduleActive ? "text-primary" : "text-gray-400"
                  }`}
                >
                  <ModuleIcon id={mod.id} />
                  {t(mod.labelKey)}
                </div>
                <ul className="ml-1 space-y-0.5 border-l border-gray-100 pl-3">
                  {mod.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={linkCls(item)}
                        onClick={onCloseMobile}
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );

  return (
    <>
      {mobileOpen ?
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="fixed inset-0 z-30 bg-gray-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
        />
      : null}
      {aside}
    </>
  );
}
