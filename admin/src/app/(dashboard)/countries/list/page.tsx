import type {Metadata} from "next";
import CountriesListView from "@/modules/countries/countries-list";

export const metadata: Metadata = {
  title: "Pays — Liste",
  description:
    "Liste des pays Firestore (codes ISO, drapeaux, traductions par locale).",
};

export default function CountriesListPage() {
  return <CountriesListView />;
}
