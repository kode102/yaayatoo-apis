"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";

const links = [
  {href: "/services", label: "Services"},
  {href: "/countries", label: "Pays"},
  {href: "/languages", label: "Langues"},
] as const;

export default function AdminShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const {user, logOut} = useAuth();
  const {editorLocale, setEditorLocale, activeLanguages, loading} =
    useEditorLocale();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-1">
            {links.map(({href, label}) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ?
                      "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            <label className="flex items-center gap-2 text-zinc-300">
              <span className="hidden sm:inline">Édition</span>
              <select
                value={editorLocale}
                disabled={loading && activeLanguages.length === 0}
                onChange={(e) => setEditorLocale(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white"
              >
                {activeLanguages.length === 0 ?
                  <option value={editorLocale}>{editorLocale}</option>
                : activeLanguages.map((l) => (
                    <option
                      key={l.id}
                      value={l.code.trim().toLowerCase()}
                    >
                      {l.code.toUpperCase()}
                    </option>
                  ))
                }
              </select>
            </label>
            {user?.email ?
              <span className="hidden sm:inline truncate max-w-[200px]">
                {user.email}
              </span>
            : null}
            <button
              type="button"
              onClick={() => void logOut()}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
