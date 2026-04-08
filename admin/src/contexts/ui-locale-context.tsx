"use client";

import {adminFetch} from "@/lib/api";
import {
  allDefaultMessageKeys,
  DEFAULT_MESSAGES,
  interpolateTemplate,
} from "@/lib/default-messages";
import {
  isValidStoredUiLocaleCode,
  uiLocaleFromEditorCode,
  type UiLocale,
  UI_LOCALE_STORAGE_KEY,
} from "@/lib/ui-locale-constants";
import {useAuth} from "@/contexts/auth-context";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UiDictionaryResponse = {
  success: boolean;
  data?: Record<string, Record<string, string>>;
  error?: string;
};

type UiLocaleContextValue = {
  /** Code locale interface (ex. fr-cm), aligné sur la langue d’édition. */
  locale: string;
  setLocale: (code: string) => void;
  t: (key: string, vars?: Record<string, string>) => string;
  refreshDictionary: () => Promise<void>;
  /** true après lecture localStorage (évite flash de locale). */
  uiReady: boolean;
  defaultKeys: string[];
};

const UiLocaleContext = createContext<UiLocaleContextValue | null>(null);

function pickString(
  key: string,
  loc: string,
  overrides: Record<string, Record<string, string>>,
): string {
  const normLoc = loc.trim().toLowerCase();
  const row = overrides[key];
  if (row) {
    const exact = row[normLoc];
    if (typeof exact === "string" && exact.trim()) return exact;
    const base: UiLocale = uiLocaleFromEditorCode(normLoc);
    const baseVal = row[base];
    if (typeof baseVal === "string" && baseVal.trim()) return baseVal;
  }
  const base = uiLocaleFromEditorCode(normLoc);
  const def = DEFAULT_MESSAGES[base][key] ?? DEFAULT_MESSAGES.fr[key];
  if (def) return def;
  return key;
}

export function UiLocaleProvider({children}: {children: ReactNode}) {
  const {user, getIdToken} = useAuth();
  const [locale, setLocaleState] = useState<string>("fr");
  const [uiReady, setUiReady] = useState(false);
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    const raw = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (raw && isValidStoredUiLocaleCode(raw)) {
      setLocaleState(raw.trim().toLowerCase());
    }
    setUiReady(true);
  }, []);

  const setLocale = useCallback((code: string) => {
    const c = code.trim().toLowerCase();
    if (!isValidStoredUiLocaleCode(c)) return;
    setLocaleState(c);
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, c);
  }, []);

  const refreshDictionary = useCallback(async () => {
    if (!user) {
      setOverrides({});
      return;
    }
    const token = await getIdToken();
    if (!token) {
      setOverrides({});
      return;
    }
    try {
      const res = await adminFetch<UiDictionaryResponse>(
        "/admin/ui-dictionary",
        token,
      );
      setOverrides(res.data ?? {});
    } catch {
      setOverrides({});
    }
  }, [user, getIdToken]);

  useEffect(() => {
    void refreshDictionary();
  }, [refreshDictionary]);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => {
      const raw = pickString(key, locale, overrides);
      return interpolateTemplate(raw, vars);
    },
    [locale, overrides],
  );

  const defaultKeys = useMemo(() => allDefaultMessageKeys(), []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      refreshDictionary,
      uiReady,
      defaultKeys,
    }),
    [locale, setLocale, t, refreshDictionary, uiReady, defaultKeys],
  );

  return (
    <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>
  );
}

export function useUiLocale(): UiLocaleContextValue {
  const ctx = useContext(UiLocaleContext);
  if (!ctx) {
    throw new Error("useUiLocale doit être utilisé dans UiLocaleProvider");
  }
  return ctx;
}
