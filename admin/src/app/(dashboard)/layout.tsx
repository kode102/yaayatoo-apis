import type {Metadata} from "next";
import Protected from "@/components/protected";

export const metadata: Metadata = {
  title: "Console",
  description:
    "Tableau de bord : listes, création et édition des contenus Firestore.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Protected>{children}</Protected>;
}
