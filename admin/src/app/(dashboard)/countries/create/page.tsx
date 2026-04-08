import type {Metadata} from "next";
import CountriesCreateView from "@/modules/countries/countries-create";

export const metadata: Metadata = {
  title: "Pays — Créer",
  description: "Créer un pays avec code ISO, drapeau et nom pour la locale d’édition.",
};

export default function CountriesCreatePage() {
  return <CountriesCreateView />;
}
