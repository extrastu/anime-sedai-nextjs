import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { TOP_N, allYears, animeData, getAnimeTitle, getCover } from "@/lib/anime"
import { SITE_URL } from "@/lib/site"

export const dynamicParams = false

type Props = { params: Promise<{ year: string }> }

export function generateStaticParams() {
  return allYears.map((year) => ({ year }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params
  const items = animeData[year]
  if (!items) return {}

  const names = items
    .slice(0, TOP_N)
    .map((item) => getAnimeTitle(item, "zh"))
    .join("、")
  const title = `${year}年最受关注的动画`
  const description = `${year}年 bgm.tv 关注度最高的 ${Math.min(items.length, TOP_N)} 部动画：${names}。`

  const cover = getCover(year, items[0])

  return {
    title,
    description,
    alternates: { canonical: `/${year}` },
    openGraph: {
      title: `${title} | 动画世代`,
      description,
      url: `/${year}`,
      images: cover ? [{ url: cover.cover, alt: `${year} 年第一名封面` }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  }
}

export default async function YearPage({ params }: Props) {
  const { year } = await params
  const items = animeData[year]
  if (!items) notFound()

  const list = items.slice(0, TOP_N)
  const index = allYears.indexOf(year)
  const prev = allYears[index - 1]
  const next = allYears[index + 1]

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${year}年最受关注的动画`,
    url: `${SITE_URL}/${year}`,
    numberOfItems: list.length,
    itemListElement: list.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: getAnimeTitle(item, "zh"),
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "动画世代", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: `${year}年`, item: `${SITE_URL}/${year}` },
    ],
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className="flex items-center gap-2 text-sm text-ink-2">
        <Link href="/" className="rounded-full border-2 border-ink bg-card px-3 py-0.5 font-semibold text-ink shadow-hard-sm press">
          动画世代
        </Link>
        <span>/</span>
        <span className="font-mono">{year}</span>
      </nav>

      <header className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Top {TOP_N} · bgm.tv</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-none sm:text-5xl">
            {year}
            <span className="ml-3 text-2xl font-bold sm:text-3xl">年最受关注的动画</span>
          </h1>
        </div>
        <p className="max-w-sm text-sm text-ink-2">
          按 bgm.tv 当年关注度排序。封面来自 Bangumi。
        </p>
      </header>

      <ol className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {list.map((item, i) => {
          const zh = getAnimeTitle(item, "zh")
          const cover = getCover(year, item)
          return (
            <li
              key={zh}
              className="flex flex-col overflow-hidden rounded-[14px] border-2 border-ink bg-card shadow-hard"
            >
              <div className="relative">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.cover}
                    alt={`${zh} 封面`}
                    loading="lazy"
                    className="aspect-[3/4] w-full border-b-2 border-ink object-cover"
                  />
                ) : (
                  <div className="dot-grid flex aspect-[3/4] w-full items-center justify-center border-b-2 border-ink bg-empty p-3 text-center font-semibold">
                    {zh}
                  </div>
                )}
                <span className="absolute left-2 top-2 grid size-9 -rotate-6 place-items-center rounded-full border-2 border-ink bg-sun font-display text-base font-extrabold text-on-pastel shadow-hard-sm">
                  {i + 1}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h2 className="text-sm font-bold leading-snug">{zh}</h2>
                <p className="line-clamp-1 text-xs text-ink-2">{getAnimeTitle(item, "en")}</p>
                <div className="mt-auto flex items-center justify-between pt-2 text-xs">
                  <span className="rounded-full bg-sky px-2 py-0.5 font-mono font-bold text-on-pastel">
                    {item.score}
                  </span>
                  {cover && (
                    <a
                      href={cover.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline underline-offset-2"
                    >
                      Bangumi ↗
                    </a>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-10 flex items-center justify-between gap-3">
        {prev ? (
          <Link href={`/${prev}`} className="press rounded-full border-2 border-ink bg-card px-4 py-2 text-sm font-bold shadow-hard-sm">
            ← {prev}
          </Link>
        ) : <span />}
        <Link href="/" className="press rounded-full border-2 border-ink bg-accent px-4 py-2 text-sm font-bold text-on-accent shadow-hard-sm">
          标记你看过的动画 →
        </Link>
        {next ? (
          <Link href={`/${next}`} className="press rounded-full border-2 border-ink bg-card px-4 py-2 text-sm font-bold shadow-hard-sm">
            {next} →
          </Link>
        ) : <span />}
      </div>
    </main>
  )
}
