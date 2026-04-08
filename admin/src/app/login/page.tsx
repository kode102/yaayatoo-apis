"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";

export default function LoginPage() {
  const {user, loading, signIn, configError} = useAuth();
  const {t} = useUiLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/services/list");
  }, [user, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
      router.replace("/services/list");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("login.signInFailed"),
      );
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-sm">
          <p className="font-semibold text-red-900">{t("login.configTitle")}</p>
          <p className="mt-2 whitespace-pre-wrap">{configError}</p>
          <p className="mt-4 text-red-700/90">{t("login.configHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/8 via-white to-gray-50 px-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-primary/12"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white shadow-md shadow-primary/20">
            Y
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("login.title")}</h1>
            <p className="text-sm text-gray-500">{t("login.secure")}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">{t("login.subtitle")}</p>
        <label className="block text-sm font-medium text-gray-700">
          {t("login.email")}
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t("login.password")}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
          />
        </label>
        {error ?
          <p className="text-sm text-red-600">{error}</p>
        : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? t("login.submitPending") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
