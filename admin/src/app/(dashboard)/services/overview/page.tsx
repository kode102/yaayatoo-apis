import type {Metadata} from "next";
import ServicesOverviewView from "@/modules/services/services-overview";

export const metadata: Metadata = {
  title: "Services — Vue d’ensemble",
  description:
    "Indicateurs services : vues, engagements, statistiques, revenus, offres (graphiques et tableaux).",
};

export default function ServicesOverviewPage() {
  return <ServicesOverviewView />;
}
