import type {Metadata} from "next";
import JobReviewCreateView from "@/modules/jobs/job-review-create";

export const metadata: Metadata = {
  title: "Avis — Créer",
  description: "Créer un avis lié à une offre d’emploi.",
};

export default function JobReviewsCreatePage() {
  return <JobReviewCreateView />;
}
