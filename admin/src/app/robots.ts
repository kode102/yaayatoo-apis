import type {MetadataRoute} from "next";

export const dynamic = "force-static";

/** Zone privée : aucune URL ne doit être explorée par les moteurs. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
