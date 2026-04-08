import type {Metadata} from "next";
import LanguagesCreateView from "@/modules/languages/languages-create";

export const metadata: Metadata = {
  title: "Langues — Créer",
  description: "Ajouter une locale (code unique, libellé, icône).",
};

export default function LanguagesCreatePage() {
  return <LanguagesCreateView />;
}
