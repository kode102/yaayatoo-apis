"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {useAuth} from "@/contexts/auth-context";
import {adminFetch, type ApiListResponse} from "@/lib/api";
import type {LanguageDoc} from "@/lib/i18n-types";

const STORAGE_KEY = "yaayatoo-admin-editor-locale";

type EditorLocaleContextValue = {
  editorLocale: string;
  setEditorLocale: (code: string) => void;
  activeLanguages: LanguageDoc[];
  loading: boolean;
  refreshLanguages: () => Promise<void>;
};

const EditorLocaleContext = createContext<EditorLocaleContextValue | null>(
  null,
);

export function EditorLocaleProvider({children}: {children: ReactNode}) {
  const {getIdToken, user} = useAuth();
  const [editorLocale, setEditorLocaleState] = useState("fr");
  const [activeLanguages, setActiveLanguages] = useState<LanguageDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshLanguages = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setActiveLanguages([]);
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch<ApiListResponse<LanguageDoc>>(
        "/admin/documents/languages",
        token,
      );
      const all = res.data ?? [];
      setActiveLanguages(all.filter((l) => l.active));
    } catch {
      setActiveLanguages([]);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setEditorLocaleState(saved.trim().toLowerCase() || "fr");
  }, []);

  useEffect(() => {
    if (user) void refreshLanguages();
  }, [user, refreshLanguages]);

  useEffect(() => {
    if (activeLanguages.length === 0) return;
    const codes = new Set(
      activeLanguages.map((l) => l.code.trim().toLowerCase()),
    );
    if (!codes.has(editorLocale)) {
      const first = activeLanguages[0]!.code.trim().toLowerCase();
      setEditorLocaleState(first);
      localStorage.setItem(STORAGE_KEY, first);
    }
  }, [activeLanguages, editorLocale]);

  const setEditorLocale = useCallback((code: string) => {
    const c = code.trim().toLowerCase();
    setEditorLocaleState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const value = useMemo(
    () => ({
      editorLocale,
      setEditorLocale,
      activeLanguages,
      loading,
      refreshLanguages,
    }),
    [editorLocale, setEditorLocale, activeLanguages, loading, refreshLanguages],
  );

  return (
    <EditorLocaleContext.Provider value={value}>
      {children}
    </EditorLocaleContext.Provider>
  );
}

export function useEditorLocale(): EditorLocaleContextValue {
  const ctx = useContext(EditorLocaleContext);
  if (!ctx) {
    throw new Error("useEditorLocale dans EditorLocaleProvider");
  }
  return ctx;
}
