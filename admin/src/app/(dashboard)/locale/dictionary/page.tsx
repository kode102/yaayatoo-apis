import type {Metadata} from "next";
import DictionaryView from "@/modules/locale/dictionary-view";

export const metadata: Metadata = {
  title: "Dictionnaire interface",
  description:
    "Surcharges multilingues des textes admin (Firestore adminUiDictionary, champ translations).",
};

export default function LocaleDictionaryPage() {
  return <DictionaryView />;
}
