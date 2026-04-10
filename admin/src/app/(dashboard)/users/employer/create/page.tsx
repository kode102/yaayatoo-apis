import type {Metadata} from "next";
import EmployerCreateView from "@/modules/users/employer-create";

export const metadata: Metadata = {
  title: "Employeurs — Créer",
  description: "Création d’un document employeur (Firestore employer).",
};

export default function EmployerCreatePage() {
  return <EmployerCreateView />;
}
