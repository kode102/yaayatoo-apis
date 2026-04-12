import type {Metadata} from "next";
import OnDemandServicesCreateView from "@/modules/on-demand-services/on-demand-services-create";

export const metadata: Metadata = {
  title: "On Demand Services — Create",
  description: "Create a new on demand service with translatable title and HTML description.",
};

export default function OnDemandServicesCreatePage() {
  return <OnDemandServicesCreateView />;
}
