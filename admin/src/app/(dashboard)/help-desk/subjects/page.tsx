import type {Metadata} from "next";
import ContactSubjectsListView from "@/modules/help-desk/contact-subjects-list";

export const metadata: Metadata = {
  title: "Help Desk — Sujets contact",
  description: "Gérer les sujets du formulaire contact (vitrine).",
};

export default function HelpDeskSubjectsPage() {
  return <ContactSubjectsListView />;
}
