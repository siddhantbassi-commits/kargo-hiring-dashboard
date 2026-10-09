import type { MetadataRoute } from "next";

// Internal tool, nothing here is meant to be publicly discoverable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
