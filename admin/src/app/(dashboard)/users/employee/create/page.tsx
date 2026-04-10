import type {Metadata} from "next";
import EmployeeCreateView from "@/modules/users/employee-create";

export const metadata: Metadata = {
  title: "Employés — Créer",
  description: "Création d’un document employé (Firestore employee).",
};

export default function EmployeeCreatePage() {
  return <EmployeeCreateView />;
}
