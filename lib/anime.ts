import animeDataRaw, { getAnimeTitle } from "../data/anime-data"
import coversRaw from "../data/covers.json"

export type AnimeItem = {
  titleZh: string
  titleEn: string
  titleJa: string
  score: number
}

export type CoverInfo = {
  id: number
  /** Bangumi cover image URL (images.large) */
  cover: string
  /** Bangumi subject page */
  url: string
  /** "exact" when the Chinese/Japanese/English title matched, "fuzzy" otherwise */
  matched: "exact" | "fuzzy"
}

export const TOP_N = 12

export const animeData: Record<string, AnimeItem[]> = animeDataRaw

export const allYears = Object.keys(animeData).sort(
  (a, b) => Number(a) - Number(b)
)

export { getAnimeTitle }

const covers = coversRaw as unknown as Record<string, CoverInfo>

/** Cover lookup key, produced by scripts/fetch-covers.ts */
export const coverKey = (year: string, item: AnimeItem) =>
  `${year}:${item.titleZh}`

export const getCover = (
  year: string,
  item: AnimeItem
): CoverInfo | undefined => covers[coverKey(year, item)]
