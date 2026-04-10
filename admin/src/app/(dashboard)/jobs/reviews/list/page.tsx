import type {Metadata} from "next";
import JobReviewsListView from "@/modules/jobs/job-reviews-list";

export const metadata: Metadata = {
  title: "Avis — Liste",
  description: "Liste des avis liés aux offres (jobReviews).",
};

export default function JobReviewsListPage() {
  return <JobReviewsListView />;
}
