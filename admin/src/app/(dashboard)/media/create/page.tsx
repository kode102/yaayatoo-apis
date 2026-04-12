import type {Metadata} from "next";
import SiteMediaCreateView from "@/modules/media/site-media-create";

export const metadata: Metadata = {
  title: "Médias — Création",
  description: "Ajouter une image (upload ou URL) avec tags et namespace.",
};

export default function SiteMediaCreatePage() {
  return <SiteMediaCreateView />;
}
