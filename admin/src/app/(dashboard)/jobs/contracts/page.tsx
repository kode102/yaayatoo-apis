import type {Metadata} from "next";
import JobContractsView from "@/modules/jobs/job-contracts-view";

export const metadata: Metadata = {
  title: "Job offers — Contracts",
  description: "Contracts linked to job offers (to be wired to data).",
};

export default function JobContractsPage() {
  return <JobContractsView />;
}
