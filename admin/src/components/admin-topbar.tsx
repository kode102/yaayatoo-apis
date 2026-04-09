"use client";

import {useCallback, useEffect, useRef, useState, type ReactNode} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {labelForRegionalLanguage, type LanguageDoc} from "@/lib/i18n-types";

function contentLangLabel(lang: LanguageDoc, editorLocale: string): string {
  return labelForRegionalLanguage(
    lang.translations,
    editorLocale,
    lang.code.toUpperCase(),
  );
}

function userDisplayName(
  email: string | null | undefined,
  displayName: string | null | undefined,
) {
  if (displayName?.trim()) return displayName.trim();
  if (!email) return "Admin";
  return email.split("@")[0] ?? "Admin";
}

function userInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "A";
}

type Props = {
  onMenuClick: () => void;
};

export default function AdminTopbar({onMenuClick}: Props) {
  const {t, setLocale: setUiLocale} = useUiLocale();
  const {user, logOut} = useAuth();
  const {editorLocale, setEditorLocale, activeLanguages, loading} =
    useEditorLocale();
  const [contentLangOpen, setContentLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const contentLangRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const closeOnOutside = useCallback((e: MouseEvent) => {
    const node = e.target as Node;
    if (contentLangRef.current && !contentLangRef.current.contains(node)) {
      setContentLangOpen(false);
    }
    if (profileRef.current && !profileRef.current.contains(node)) {
      setProfileOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!contentLangOpen && !profileOpen) return;
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [contentLangOpen, profileOpen, closeOnOutside]);

  useEffect(() => {
    if (!editorLocale?.trim()) return;
    setUiLocale(editorLocale.trim().toLowerCase());
  }, [editorLocale, setUiLocale]);

  const currentContentLang =
    activeLanguages.find(
      (l) => l.code.trim().toLowerCase() === editorLocale.toLowerCase(),
    ) ?? activeLanguages[0];

  const displayName = userDisplayName(
    user?.email ?? undefined,
    user?.displayName ?? undefined,
  );

  const dropdownLabel =
    currentContentLang ?
      contentLangLabel(currentContentLang, editorLocale)
    : editorLocale.toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:gap-4 lg:px-8">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 lg:hidden"
          aria-label={t("topbar.openMenu")}
          onClick={onMenuClick}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="relative min-w-0 flex-1 basis-[200px] lg:max-w-xl">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="m21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
              />
            </svg>
          </span>
          <input
            type="search"
            name="admin-search"
            placeholder={t("topbar.searchPlaceholder")}
            className="w-full rounded-full border-0 bg-primary/8 py-2.5 pr-4 pl-12 text-sm text-secondary shadow-inner shadow-primary/10 placeholder:text-primary/45 focus:ring-2 focus:ring-primary/25 focus:outline-none"
            autoComplete="off"
          />
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="relative" ref={contentLangRef}>
            <span className="sr-only">{t("topbar.contentLang")}</span>
            <button
              type="button"
              disabled={loading && activeLanguages.length === 0}
              onClick={() => setContentLangOpen((o) => !o)}
              className="flex max-w-[min(100%,280px)] items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 sm:px-3"
              aria-expanded={contentLangOpen}
              aria-haspopup="listbox"
              aria-label={dropdownLabel}
            >
              {currentContentLang?.flagIconUrl ?
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentContentLang.flagIconUrl}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-full object-cover"
                  width={24}
                  height={24}
                />
              : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tertiary-accent/25 text-xs font-medium text-secondary ring-1 ring-tertiary-accent/40">
                  {editorLocale.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{dropdownLabel}</span>
              <svg
                className="h-4 w-4 shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
              </svg>
            </button>
            {contentLangOpen ?
              <ul
                className="absolute top-full right-0 z-50 mt-1 max-h-64 min-w-[220px] overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                role="listbox"
                aria-label={t("topbar.contentLang")}
              >
                {activeLanguages.length === 0 ?
                  <li className="px-3 py-2 text-sm text-gray-500">
                    {t("topbar.noActiveContentLang")}
                  </li>
                : activeLanguages.map((l) => {
                    const code = l.code.trim().toLowerCase();
                    const selected = code === editorLocale.toLowerCase();
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                            selected ?
                              "bg-primary/10 font-medium text-secondary"
                            : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setEditorLocale(code);
                            setUiLocale(code);
                            setContentLangOpen(false);
                          }}
                        >
                          {l.flagIconUrl ?
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={l.flagIconUrl}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                              width={24}
                              height={24}
                            />
                          : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs">
                              {l.code.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          {contentLangLabel(l, editorLocale)}
                        </button>
                      </li>
                    );
                  })
                }
              </ul>
            : null}
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <TopbarIconButton label={t("topbar.messages")} badge={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
              />
            </TopbarIconButton>
            <TopbarIconButton label={t("topbar.notifications")} badge={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.082A2.02 2.02 0 0 0 21 14.016V11a8 8 0 1 0-16 0v3.016c0 1.061.425 2.078 1.18 2.82.6.59 1.35 1.02 2.18 1.082M9 17h6m-7 4h8a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3v1a1 1 0 0 0 1 1Z"
              />
            </TopbarIconButton>
            <TopbarIconButton label={t("topbar.settings")}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </TopbarIconButton>
          </div>

          <div className="relative flex items-center pl-1" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-gray-50 sm:gap-3 sm:pr-3"
              aria-expanded={profileOpen}
            >
              {user?.photoURL ?
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                  width={40}
                  height={40}
                />
              : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-sm font-semibold text-white">
                  {userInitials(displayName)}
                </span>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">{t("topbar.admin")}</p>
              </div>
            </button>
            {profileOpen ?
              <div className="absolute top-full right-0 z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {user?.email ?
                  <p className="truncate border-b border-gray-100 px-3 py-2 text-xs text-gray-500">
                    {user.email}
                  </p>
                : null}
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => void logOut()}
                >
                  {t("topbar.logout")}
                </button>
              </div>
            : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function TopbarIconButton({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-tertiary-accent/15 hover:text-secondary"
      aria-label={label}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
      {badge !== undefined ?
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-md bg-tertiary-accent px-1 text-center text-[10px] font-semibold leading-[18px] text-secondary">
          {badge}
        </span>
      : null}
    </button>
  );
}
