import type {Metadata} from "next";
import CmsSectionsView from "@/modules/cms/cms-sections-view";

export const metadata: Metadata = {
  title: "CMS — Sous-sections",
  description: "Gestion CMS des sous-sections du site avec contenu multilingue.",
};

export default function CmsSectionsPage() {
  return <CmsSectionsView />;
}
