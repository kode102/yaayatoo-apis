import type {Metadata} from "next";
import NewsFeedView from "@/modules/cms/news-feed-view";

export const metadata: Metadata = {
  title: "CMS — Blog & News — News Feed",
  description: "Manage scrolling News Feed items used by the website footer.",
};

export default function CmsBlogNewsFeedPage() {
  return <NewsFeedView />;
}
