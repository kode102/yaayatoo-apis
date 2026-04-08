import type {MetadataRoute} from "next";
import {getAdminSiteUrl} from "@/lib/site-url";

export const dynamic = "force-static";

const STATIC_PATHS: string[] = [
  "/",
  "/login",
  "/services",
  "/services/list",
  "/services/create",
  "/countries",
  "/countries/list",
  "/countries/create",
  "/languages",
  "/languages/list",
  "/languages/create",
  "/locale",
  "/locale/dictionary",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAdminSiteUrl();
  const lastModified = new Date();
  return STATIC_PATHS.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 0.3 : 0.2,
  }));
}
