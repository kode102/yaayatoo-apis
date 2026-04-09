import type {Metadata} from "next";
import CmsNamespacesListView from "@/modules/cms/cms-namespaces-list";

export const metadata: Metadata = {
  title: "CMS — Espaces",
  description: "Créer et gérer les espaces (Home, Contact, etc.) pour le contenu CMS.",
};

export default function CmsNamespacesListPage() {
  return <CmsNamespacesListView />;
}
