import type {Metadata} from "next";
import ContactMessagesListView from "@/modules/help-desk/contact-messages-list";

export const metadata: Metadata = {
  title: "Help Desk — Messages contact",
  description: "Messages envoyés depuis le formulaire contact du site.",
};

export default function HelpDeskMessagesPage() {
  return <ContactMessagesListView />;
}
