import type {Metadata} from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connexion sécurisée à la console Yaayatoo (Firebase Auth, e-mail et mot de passe).",
};

export default function LoginLayout({children}: {children: React.ReactNode}) {
  return children;
}
