// Set NEXT_PUBLIC_SITE_URL in production, e.g. https://anime-sedai.example.com
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "")
