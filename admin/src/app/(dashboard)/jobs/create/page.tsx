import type {Metadata} from "next";
import JobOfferCreateView from "@/modules/jobs/job-offer-create";

export const metadata: Metadata = {
  title: "Offres — Créer",
  description: "Créer une offre liée à un employeur et à un service.",
};

export default function JobsCreatePage() {
  return <JobOfferCreateView />;
}
