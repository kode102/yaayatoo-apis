import type {Metadata} from "next";
import FirebaseUsersListView from "@/modules/users/firebase-users-list";

export const metadata: Metadata = {
  title: "Comptes Firebase — Liste",
  description: "Liste et gestion des utilisateurs Firebase Auth.",
};

export default function FirebaseUsersListPage() {
  return <FirebaseUsersListView />;
}
