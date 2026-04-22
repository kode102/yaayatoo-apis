import type {Metadata} from "next";
import ContactSubjectCreateView from "@/modules/help-desk/contact-subject-create";

export const metadata: Metadata = {
  title: "Help Desk — Nouveau sujet",
  description: "Créer un sujet pour le formulaire contact.",
};

export default function HelpDeskSubjectCreatePage() {
  return <ContactSubjectCreateView />;
}
