/**
 * Looks up each anime in the Bangumi API and stores its cover in data/covers.json.
 *
 *   BGM_USER_AGENT="my-app/0.1 (https://github.com/you/repo)" npm run fetch-covers
 *
 * Re-running only fetches entries missing from covers.json.
 * Bangumi asks API clients to send a descriptive User-Agent.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import animeData from "../data/anime-data"

type Item = { titleZh: string; titleEn: string; titleJa: string; score: number }
type CoverInfo = { id: number; cover: string; url: string; matched: "exact" | "fuzzy" }
type Subject = {
  id: number
  name: string
  name_cn: string
  images?: { large?: string; common?: string; medium?: string }
}

const API = "https://api.bgm.tv/v0/search/subjects"
const USER_AGENT =
  process.env.BGM_USER_AGENT ?? "anime-sedai-nextjs/0.1 (set BGM_USER_AGENT to your repo URL)"
const OUT = path.join(process.cwd(), "data", "covers.json")
const DELAY_MS = 400
const TOP_N = 12

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function search(keyword: string, year: number): Promise<Subject[]> {
  const body = {
    keyword,
    sort: "match",
    filter: {
      type: [2], // 2 = anime
      air_date: [`>=${year}-01-01`, `<${year + 1}-01-01`],
    },
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API}?limit=5`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const json = (await res.json()) as { data?: Subject[] }
      return json.data ?? []
    }
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`Bangumi HTTP ${res.status} for "${keyword}"`)
    }
    await sleep(1000 * attempt)
  }
  return []
}

const coverUrl = (s: Subject) => s.images?.large ?? s.images?.common ?? s.images?.medium

function pick(item: Item, list: Subject[]): CoverInfo | undefined {
  const withCover = list.filter((s) => coverUrl(s))
  const exact = withCover.find(
    (s) => s.name_cn === item.titleZh || s.name === item.titleJa || s.name === item.titleEn
  )
  const hit = exact ?? withCover[0]
  if (!hit) return undefined
  return {
    id: hit.id,
    cover: coverUrl(hit)!,
    url: `https://bgm.tv/subject/${hit.id}`,
    matched: exact ? "exact" : "fuzzy",
  }
}

async function main() {
  const covers: Record<string, CoverInfo> = existsSync(OUT)
    ? JSON.parse(readFileSync(OUT, "utf8"))
    : {}
  const stats = { exact: 0, fuzzy: 0, missing: 0, cached: 0 }
  const missing: string[] = []

  for (const [year, items] of Object.entries(animeData)) {
    for (const item of items.slice(0, TOP_N)) {
      const key = `${year}:${item.titleZh}`
      if (covers[key]) {
        stats.cached++
        continue
      }

      let info: CoverInfo | undefined
      try {
        // Try Japanese title first, then English, then Chinese.
        const keywords = [...new Set([item.titleJa, item.titleEn, item.titleZh])]
        for (const keyword of keywords) {
          await sleep(DELAY_MS)
          info = pick(item, await search(keyword, Number(year)))
          if (info?.matched === "exact") break
        }
      } catch (error) {
        console.error(`[error] ${key}:`, error instanceof Error ? error.message : error)
      }

      if (info) {
        covers[key] = info
        stats[info.matched]++
        writeFileSync(OUT, JSON.stringify(covers, null, 2) + "\n")
        console.log(`[${info.matched}] ${key} -> ${info.id}`)
      } else {
        stats.missing++
        missing.push(key)
        console.log(`[missing] ${key}`)
      }
    }
  }

  console.log("\nDone:", stats)
  if (missing.length) {
    console.log("Missing covers (add manually to data/covers.json or re-run later):")
    for (const key of missing) console.log("  -", key)
  }
}

main()
