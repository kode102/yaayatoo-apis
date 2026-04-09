import type {Metadata} from "next";
import CmsNamespaceCreateView from "@/modules/cms/cms-namespace-create";

export const metadata: Metadata = {
  title: "CMS — Créer un espace",
  description: "Nouvel espace de nommage pour les sections du site.",
};

export default function CmsNamespaceCreatePage() {
  return <CmsNamespaceCreateView />;
}
