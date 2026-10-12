import type { NextRequest } from "next/server"

/**
 * Same-origin proxy for Bangumi cover images.
 * Image export (modern-screenshot) can only embed images it can read, and the
 * Bangumi CDN does not send CORS headers. Only lain.bgm.tv over https is allowed.
 */
const ALLOWED_HOSTS = new Set(["lain.bgm.tv"])

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u")
  if (!raw) return new Response("missing u", { status: 400 })

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return new Response("invalid url", { status: 400 })
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("forbidden", { status: 403 })
  }

  const upstream = await fetch(target, {
    headers: {
      "User-Agent": process.env.BGM_USER_AGENT ?? "anime-sedai-nextjs/0.1",
      Accept: "image/*",
    },
  })
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream error", { status: 502 })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  })
}
