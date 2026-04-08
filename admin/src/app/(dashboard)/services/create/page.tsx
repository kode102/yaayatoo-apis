import type {Metadata} from "next";
import ServicesCreateView from "@/modules/services/services-create";

export const metadata: Metadata = {
  title: "Services — Créer",
  description: "Créer une entrée service pour la locale d’édition sélectionnée.",
};

export default function ServicesCreatePage() {
  return <ServicesCreateView />;
}
