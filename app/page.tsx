import type { Metadata } from "next"
import Link from "next/link"
import { AnimeSedai } from "@/components/AnimeSedai"
import { allYears } from "@/lib/anime"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: { absolute: "动画世代 | 历年最受关注动画封面墙" },
  description:
    "回顾 2006 至 2025 年每年 bgm.tv 关注度最高的动画，附 Bangumi 封面。点击标记你看过的作品，一键生成锐评提示词或图片。",
  alternates: { canonical: "/" },
}

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "动画世代",
    alternateName: "Anime Sedai",
    url: `${SITE_URL}/`,
    inLanguage: ["zh-CN", "en", "ja"],
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AnimeSedai />
      <nav
        aria-label="按年份浏览"
        className="mx-auto max-w-6xl px-4 pb-12 sm:px-6"
      >
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">按年份浏览</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {allYears.map((year) => (
            <li key={year}>
              <Link
                href={`/${year}`}
                className="inline-block rounded border px-2 py-1 hover:bg-zinc-100"
              >
                {year}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
