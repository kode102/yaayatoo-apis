import type {Metadata} from "next";
import SiteMediaListView from "@/modules/media/site-media-list";

export const metadata: Metadata = {
  title: "Médias — Liste",
  description: "Images et visuels par tag et namespace pour le site vitrine.",
};

export default function SiteMediaListPage() {
  return <SiteMediaListView />;
}
