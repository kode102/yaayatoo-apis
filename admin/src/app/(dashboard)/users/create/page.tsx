import type {Metadata} from "next";
import FirebaseUserCreateView from "@/modules/users/firebase-user-create";

export const metadata: Metadata = {
  title: "Comptes Firebase — Créer",
  description: "Création d’un utilisateur Firebase (téléphone, nom affiché).",
};

export default function FirebaseUserCreatePage() {
  return <FirebaseUserCreateView />;
}
