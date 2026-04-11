import type {Metadata} from "next";
import CmsSettingsView from "@/modules/cms/cms-settings-view";

export const metadata: Metadata = {
  title: "CMS — Settings",
  description: "Manage global app stores, social links, phones and emails.",
};

export default function CmsSettingsPage() {
  return <CmsSettingsView />;
}
