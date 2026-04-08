import type {Metadata} from "next";
import LanguagesListView from "@/modules/languages/languages-list";

export const metadata: Metadata = {
  title: "Langues — Liste",
  description:
    "Langues actives pour le site et la console (Firestore collection languages).",
};

export default function LanguagesListPage() {
  return <LanguagesListView />;
}
