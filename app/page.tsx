import type { Metadata } from "next"
import { AnimeSedai } from "@/components/AnimeSedai"
import { YearIndex } from "@/components/YearIndex"
import { SITE_URL } from "@/lib/site"
import { allYears, animeData, getAnimeTitle, getCover } from "@/lib/anime"

const latestYear = allYears[allYears.length - 1]
const ogCover = getCover(latestYear, animeData[latestYear][0])

export const metadata: Metadata = {
  title: { absolute: "动画世代 | 历年最受关注动画封面墙" },
  description:
    "回顾 2006 至 2025 年每年 bgm.tv 关注度最高的动画，附 Bangumi 封面。点击标记你看过的作品，一键生成锐评提示词或图片。",
  alternates: { canonical: "/" },
  openGraph: {
    title: "动画世代 | 历年最受关注动画封面墙",
    description: "历年 bgm.tv 关注度 Top 12 动画封面墙，标记看过的作品，导出分享图。",
    url: "/",
    images: ogCover ? [{ url: ogCover.cover, alt: `${latestYear} 年第一名：${getAnimeTitle(animeData[latestYear][0], "zh")}` }] : undefined,
  },
  twitter: { card: "summary_large_image" },
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
      <section className="mx-auto max-w-3xl px-4 pb-12 text-sm leading-relaxed text-ink-2 sm:px-6">
        <h2 className="mb-2 font-display text-xl font-bold text-ink">关于动画世代</h2>
        <p>
          动画世代收录 2006 至 2025 年每年 bgm.tv（番组计划）关注度最高的前 12 部电视动画，封面来自 Bangumi。
          你可以标记看过的作品，统计每年的观看进度，导出分享图，或复制锐评提示词。
        </p>
        <p className="mt-2">
          榜单按播出年份归类，每一年都有独立页面，可以直接查看某一年的热门动画。
        </p>
      </section>
      <YearIndex />
    </main>
  )
}
