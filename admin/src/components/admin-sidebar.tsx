"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {ADMIN_NAV_MODULES} from "@/config/admin-nav";
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
    case "countries":
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
    case "languages":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25v3.304m0 0a48.035 48.035 0 0 0-3.286.004V9.75m3.286 0c.358.217.683.49.956.804M9 9.75v3.304m0 0A48.235 48.235 0 0 0 12 15.75m-3-2.696v-3.304m0 0c-.364-.217-.699-.49-.956-.804M12 15.75a48.147 48.147 0 0 0 3.478-.397m-7.065 0A48.11 48.11 0 0 1 12 13.5c-1.036 0-2.047.106-3.022.304m7.065 0A48.536 48.536 0 0 0 12 9.75m-3 3.304 48.536 48.536 0 0 0-3.478-.397M12 15.75v-3.75m0 0c1.036 0 2.047-.106 3.022-.304M12 8.25a48.11 48.11 0 0 0-3.478.397m3.478-.397v3.75"
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

  const linkCls = (href: string) => {
    const active = pathname === href || pathname === `${href}/`;
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
          href="/services/list"
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
                        className={linkCls(item.href)}
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
