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
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {ensureFirebaseApp, getFirebaseAuth} from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    void ensureFirebaseApp()
      .then(() => {
        if (cancelled) return;
        const auth = getFirebaseAuth();
        if (cancelled) return;
        unsub = onAuthStateChanged(auth, (u) => {
          if (cancelled) return;
          // Décale hors du callback Firebase pour éviter des courses avec Strict Mode / HMR.
          queueMicrotask(() => {
            if (cancelled) return;
            setUser(u);
            setLoading(false);
          });
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        queueMicrotask(() => {
          if (cancelled) return;
          setConfigError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        });
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await ensureFirebaseApp();
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const logOut = useCallback(async () => {
    await ensureFirebaseApp();
    const auth = getFirebaseAuth();
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      configError,
      signIn,
      logOut,
      getIdToken,
    }),
    [user, loading, configError, signIn, logOut, getIdToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
