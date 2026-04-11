import type {Metadata} from "next";
import CmsBlogArticlesView from "@/modules/cms/cms-blog-articles-view";

export const metadata: Metadata = {
  title: "CMS — Blog & News — Blog Articles",
  description: "Entry point for blog articles management.",
};

export default function CmsBlogArticlesPage() {
  return <CmsBlogArticlesView />;
}
