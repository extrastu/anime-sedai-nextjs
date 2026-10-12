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

  return {
    title,
    description,
    alternates: { canonical: `/${year}` },
    openGraph: {
      title: `${title} | 动画世代`,
      description,
      url: `/${year}`,
    },
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-zinc-500">
        <Link href="/" className="underline">
          动画世代
        </Link>{" "}
        / {year}
      </nav>

      <h1 className="mt-3 text-2xl font-bold">{year} 年最受关注的动画</h1>
      <p className="mt-2 text-sm text-zinc-600">
        数据来自 bgm.tv，按当年关注度排序，每年展示前 {TOP_N} 部。封面来自 Bangumi。
      </p>

      <ol className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {list.map((item, i) => {
          const zh = getAnimeTitle(item, "zh")
          const cover = getCover(year, item)
          return (
            <li key={zh} className="flex flex-col overflow-hidden rounded-md border">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.cover}
                  alt={`${zh} 封面`}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center bg-zinc-100 p-2 text-center text-sm">
                  {zh}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-1 p-3">
                <span className="text-xs text-zinc-400">
                  #{i + 1} · {item.score}
                </span>
                <h2 className="text-sm font-semibold leading-snug">{zh}</h2>
                <p className="text-xs text-zinc-500">{getAnimeTitle(item, "en")}</p>
                {cover && (
                  <a
                    href={cover.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto pt-1 text-xs underline"
                  >
                    Bangumi
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-8 flex justify-between text-sm">
        {prev ? (
          <Link href={`/${prev}`} className="underline">
            ← {prev}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/${next}`} className="underline">
            {next} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p className="mt-8 text-center">
        <Link href="/" className="underline">
          打开互动版，标记你看过的动画 →
        </Link>
      </p>
    </main>
  )
}
