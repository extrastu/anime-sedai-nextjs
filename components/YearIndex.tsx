import Link from "next/link"
import { TOP_N, allYears, animeData, getAnimeTitle, getCover } from "@/lib/anime"

/** Server-rendered year index: large poster cards linking to /[year], grouped by decade. */
export function YearIndex() {
  const decades = new Map<string, string[]>()
  for (const year of allYears) {
    const decade = `${Math.floor(Number(year) / 10) * 10}s`
    decades.set(decade, [...(decades.get(decade) ?? []), year])
  }

  return (
    <section aria-labelledby="year-index" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="year-index" className="font-display text-3xl font-extrabold">
          历年榜单
        </h2>
        <p className="font-mono text-xs text-ink-2">
          每年 Top {TOP_N} · 点击封面进入该年完整榜单
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {[...decades.entries()].map(([decade, years]) => (
          <div key={decade}>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full border-2 border-ink bg-sun px-3 py-0.5 font-display text-sm font-extrabold text-on-pastel shadow-hard-sm">
                {decade}
              </span>
              <span className="h-0.5 flex-1 bg-ink/20" />
            </div>

            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {years.map((year) => {
                const top = animeData[year][0]
                const cover = top ? getCover(year, top) : undefined
                const title = top ? getAnimeTitle(top, "zh") : ""
                return (
                  <li key={year}>
                    <Link
                      href={`/${year}`}
                      className="press group block overflow-hidden rounded-[14px] border-2 border-ink bg-card shadow-hard"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden border-b-2 border-ink bg-empty">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover.cover}
                            alt={`${year} 年第一名：${title}`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="dot-grid flex h-full w-full items-center justify-center p-4 text-center text-sm font-semibold text-ink-2">
                            {title}
                          </div>
                        )}
                        <span className="absolute left-3 top-3 rounded-full border-2 border-ink bg-accent px-3 py-0.5 font-display text-xl font-extrabold leading-tight text-on-accent shadow-hard-sm -rotate-3">
                          {year}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 sm:p-4">
                        <p className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">
                          {title}
                        </p>
                        <div className="flex items-center justify-between text-xs text-ink-2">
                          <span>第 1 名</span>
                          <span className="font-mono font-bold text-ink">
                            {top?.score}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
