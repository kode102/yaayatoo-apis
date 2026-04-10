import type {Metadata} from "next";
import JobOffersListView from "@/modules/jobs/job-offers-list";

export const metadata: Metadata = {
  title: "Offres — Liste",
  description: "Liste des offres d’emploi (jobOffers).",
};

export default function JobsListPage() {
  return <JobOffersListView />;
}
