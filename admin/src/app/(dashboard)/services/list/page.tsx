import type {Metadata} from "next";
import ServicesListView from "@/modules/services/services-list";

export const metadata: Metadata = {
  title: "Services — Liste",
  description:
    "Liste des services Firestore, tri selon la langue d’édition du contenu.",
};

export default function ServicesListPage() {
  return <ServicesListView />;
}
