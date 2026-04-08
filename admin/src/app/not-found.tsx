import type {Metadata} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
  description: "La page demandée n’existe pas dans la console Yaayatoo Admin.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-secondary">404</h1>
      <p className="max-w-md text-sm text-gray-600">
        Cette adresse ne correspond à aucune page de l’administration.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
      >
        Retour à la connexion
      </Link>
    </div>
  );
}
