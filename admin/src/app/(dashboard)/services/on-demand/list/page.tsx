import type {Metadata} from "next";
import OnDemandServicesListView from "@/modules/on-demand-services/on-demand-services-list";

export const metadata: Metadata = {
  title: "On Demand Services — List",
  description: "List of on demand services, per country and locale.",
};

export default function OnDemandServicesListPage() {
  return <OnDemandServicesListView />;
}
