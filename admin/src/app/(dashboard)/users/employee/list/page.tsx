import type {Metadata} from "next";
import EmployeeListView from "@/modules/users/employee-list";

export const metadata: Metadata = {
  title: "Employés — Liste",
  description: "Profils employés liés aux comptes Firebase.",
};

export default function EmployeeListPage() {
  return <EmployeeListView />;
}
