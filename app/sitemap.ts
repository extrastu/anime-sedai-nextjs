import type { MetadataRoute } from "next"
import { allYears } from "@/lib/anime"
import { SITE_URL } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1 },
    ...allYears.map((year) => ({
      url: `${SITE_URL}/${year}`,
      lastModified: now,
      priority: 0.7,
    })),
  ]
}
