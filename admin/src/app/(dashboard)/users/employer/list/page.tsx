import type {Metadata} from "next";
import EmployerListView from "@/modules/users/employer-list";

export const metadata: Metadata = {
  title: "Employeurs — Liste",
  description: "Profils employeurs liés aux comptes Firebase.",
};

export default function EmployerListPage() {
  return <EmployerListView />;
}
