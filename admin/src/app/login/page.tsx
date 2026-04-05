"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/contexts/auth-context";

export default function LoginPage() {
  const {user, loading, signIn, configError} = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/services");
  }, [user, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
      router.replace("/services");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Échec de la connexion");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Chargement…
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-lg rounded-xl border border-red-900/60 bg-red-950/30 p-6 text-sm text-red-200">
          <p className="font-semibold text-red-100">Configuration admin</p>
          <p className="mt-2 whitespace-pre-wrap">{configError}</p>
          <p className="mt-4 text-zinc-400">
            En production (Hosting statique), placez{" "}
            <code className="text-zinc-300">runtime-config.json</code> dans{" "}
            <code className="text-zinc-300">admin/public/</code> puis redéployez.
            Voir <code className="text-zinc-300">runtime-config.example.json</code>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h1 className="text-xl font-semibold text-white">Admin Yaayatoo</h1>
        <p className="text-sm text-zinc-400">
          Connectez-vous avec un compte Firebase (e-mail / mot de passe).
        </p>
        <label className="block text-sm text-zinc-300">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-blue-500"
            required
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Mot de passe
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-blue-500"
            required
          />
        </label>
        {error ?
          <p className="text-sm text-red-400">{error}</p>
        : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
