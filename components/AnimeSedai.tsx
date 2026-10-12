"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { domToBlob } from "modern-screenshot"
import { Toaster, toast } from "sonner"
import {
  TOP_N,
  allYears,
  animeData,
  getAnimeTitle,
  getCover,
  type AnimeItem,
} from "@/lib/anime"
import { getPromptTemplate, translations, type Language } from "@/lib/i18n"

type YearRange = "5" | "10" | "15" | "all"
type PromptType = "normal" | "zako"
type TranslationKey = keyof typeof translations.zh

const YEAR_RANGES: YearRange[] = ["5", "10", "15", "all"]
const YEAR_RANGE_KEY: Record<YearRange, TranslationKey> = {
  "5": "last5Years",
  "10": "last10Years",
  "15": "last15Years",
  all: "allYears",
}
const LANGUAGES: { code: Language; key: TranslationKey }[] = [
  { code: "zh", key: "chinese" },
  { code: "en", key: "english" },
  { code: "ja", key: "japanese" },
]
const FOOTER: Record<Language, [string, string, string]> = {
  zh: ["数据来源 bgm.tv，封面来自 Bangumi。基于 ", "egoist/anime-sedai", " (MIT) 重制"],
  en: ["Data from bgm.tv, covers from Bangumi. Rebuilt from ", "egoist/anime-sedai", " (MIT)"],
  ja: ["データソース：bgm.tv、カバー：Bangumi。", "egoist/anime-sedai", " (MIT) をもとに作成"],
}

/** Persists state in localStorage. Reads after mount so SSR and hydration match. */
function useStoredState<T>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {
      /* storage unavailable or corrupt: keep the default */
    }
    setLoaded(true)
  }, [key])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [key, value, loaded])

  return [value, setValue]
}

export function AnimeSedai() {
  const [language, setLanguage] = useStoredState<Language>("language", "zh")
  const [selected, setSelected] = useStoredState<string[]>("selectedAnime", [])
  const [yearRange, setYearRange] = useStoredState<YearRange>("yearRange", "all")
  const [promptType, setPromptType] = useState<PromptType>("zako")
  const captureRef = useRef<HTMLDivElement>(null)

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text: string = translations[language][key] || translations.zh[key]
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replace(`{{${name}}}`, String(value))
        }
      }
      return text
    },
    [language]
  )

  useEffect(() => {
    document.title = t("title")
  }, [t])

  const visibleYears = useMemo(
    () =>
      yearRange === "all" ? allYears : allYears.slice(-Number(yearRange)),
    [yearRange]
  )

  // Selection is keyed by the Chinese title, as in the original app.
  const visibleKeys = useMemo(
    () =>
      visibleYears.flatMap((year) =>
        (animeData[year] ?? [])
          .slice(0, TOP_N)
          .map((item) => getAnimeTitle(item, "zh"))
      ),
    [visibleYears]
  )
  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys])
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const watchedCount = visibleKeys.filter((key) => selectedSet.has(key)).length

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )

  const selectAll = () =>
    setSelected((prev) => [
      ...prev.filter((k) => !visibleKeySet.has(k)),
      ...visibleKeys,
    ])

  const clearVisible = () =>
    setSelected((prev) => prev.filter((k) => !visibleKeySet.has(k)))

  const prompt = useMemo(() => {
    const templates = getPromptTemplate(language)
    const preset = promptType === "normal" ? templates.normal : templates.zako
    const header =
      language === "en"
        ? "User anime viewing record: (the year below is the anime release year)"
        : "用户动画观看记录：(下面的年份是动画发布的年份)"

    const sections = visibleYears
      .map((year) => {
        const items = (animeData[year] ?? []).slice(0, TOP_N)
        if (items.length === 0) return ""
        const watched = items
          .filter((i) => selectedSet.has(getAnimeTitle(i, "zh")))
          .map((i) => getAnimeTitle(i, language))
          .join(", ")
        const unwatched = items
          .filter((i) => !selectedSet.has(getAnimeTitle(i, "zh")))
          .map((i) => getAnimeTitle(i, language))
          .join(", ")
        return [
          `**${year}${t("year")}**:`,
          `${t("watched")}: ${watched || t("none")}`,
          `${t("notWatched")}: ${unwatched || t("none")}`,
        ].join("\n")
      })
      .filter(Boolean)
      .join("\n")

    return [preset, header, sections].join("\n").trim()
  }, [language, promptType, visibleYears, selectedSet, t])

  const captureBlob = async () => {
    if (!captureRef.current) throw new Error(t("unknownError"))
    const blob = await domToBlob(captureRef.current, {
      scale: 2,
      filter: (node) =>
        !(node instanceof HTMLElement && node.classList.contains("remove")),
    })
    if (!blob) throw new Error(t("unknownError"))
    return blob
  }

  const copyImage = async () => {
    const blob = await captureBlob()
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
  }

  const downloadImage = async () => {
    const blob = await captureBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "anime-sedai.png"
    a.click()
    URL.revokeObjectURL(url)
  }

  const errorText = (error: unknown) =>
    error instanceof Error ? error.message : t("unknownError")

  const [before, link, after] = FOOTER[language]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      <Toaster />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          {t("yearRange")}:
          <select
            className="rounded border bg-white px-2 py-1 text-sm"
            value={yearRange}
            onChange={(e) => setYearRange(e.currentTarget.value as YearRange)}
          >
            {YEAR_RANGES.map((option) => (
              <option key={option} value={option}>
                {t(YEAR_RANGE_KEY[option])}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600">{t("language")}:</span>
          {LANGUAGES.map(({ code, key }) => (
            <button
              key={code}
              type="button"
              aria-pressed={language === code}
              onClick={() => setLanguage(code)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                language === code
                  ? "bg-blue-500 text-white"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <div ref={captureRef} className="w-full overflow-hidden border bg-white">
        <header className="flex flex-col gap-1 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold">
            {t("title")}
            <span className="remove text-sm font-normal text-zinc-500">
              {" "}- {t("subtitle")}
            </span>
            <span className="ml-2 text-sm font-medium text-zinc-400">
              {t("website")}
            </span>
          </h1>
          <span className="text-sm">
            {t("watchedCount", {
              count: watchedCount,
              total: visibleKeys.length,
            })}
          </span>
        </header>

        {visibleYears.map((year) => (
          <YearRow
            key={year}
            year={year}
            language={language}
            selectedSet={selectedSet}
            onToggle={toggle}
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <ActionButton onClick={selectAll}>{t("selectAll")}</ActionButton>
        {watchedCount > 0 && (
          <ActionButton onClick={clearVisible}>{t("clear")}</ActionButton>
        )}
        <ActionButton
          onClick={() =>
            toast.promise(copyImage(), {
              loading: t("copying"),
              success: t("copySuccess"),
              error: (error) =>
                t("copyFailed", { error: errorText(error) }),
            })
          }
        >
          {t("copyImage")}
        </ActionButton>
        <ActionButton
          onClick={() =>
            toast.promise(downloadImage(), {
              loading: t("downloading"),
              success: t("downloadSuccess"),
              error: (error) =>
                t("downloadFailed", { error: errorText(error) }),
            })
          }
        >
          {t("downloadImage")}
        </ActionButton>
      </div>

      <section className="mx-auto w-full max-w-2xl rounded-md border">
        <div className="flex flex-col gap-2 border-b p-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm">
            {t("promptType")}
            <select
              className="rounded-md border px-2 py-1"
              value={promptType}
              onChange={(e) =>
                setPromptType(e.currentTarget.value as PromptType)
              }
            >
              <option value="normal">{t("promptNormal")}</option>
              <option value="zako">{t("promptZako")}</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <ActionButton
              small
              onClick={() => {
                navigator.clipboard.writeText(prompt)
                toast.success(t("copySuccess"))
              }}
            >
              {t("copy")}
            </ActionButton>
            <ActionButton
              small
              onClick={() => {
                location.href = `chatwise://chat?input=${encodeURIComponent(prompt)}`
              }}
            >
              {t("openInChatWise")}
            </ActionButton>
          </div>
        </div>
        <textarea
          readOnly
          rows={10}
          value={prompt}
          className="w-full cursor-default resize-none p-2 outline-none"
        />
      </section>

      <p className="text-center text-sm text-zinc-500">
        {before}
        <a
          href="https://github.com/egoist/anime-sedai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {link}
        </a>
        {after}
      </p>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  small,
}: {
  children: React.ReactNode
  onClick: () => void
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md border hover:bg-zinc-100 ${
        small ? "h-7 px-2 text-sm text-zinc-600" : "px-4 py-2 text-sm"
      }`}
    >
      {children}
    </button>
  )
}

function YearRow({
  year,
  language,
  selectedSet,
  onToggle,
}: {
  year: string
  language: Language
  selectedSet: Set<string>
  onToggle: (key: string) => void
}) {
  const items = (animeData[year] ?? []).slice(0, TOP_N)

  return (
    <section className="flex flex-col border-b last:border-b-0 sm:flex-row">
      <h2 className="flex items-center justify-center bg-red-500 py-2 text-base font-bold text-white sm:w-20 sm:shrink-0 sm:py-0">
        {year}
      </h2>
      <div className="grid flex-1 grid-cols-4 gap-px bg-zinc-200 sm:grid-cols-6 lg:grid-cols-12">
        {items.map((item) => (
          <AnimeCard
            key={item.titleZh}
            year={year}
            item={item}
            language={language}
            selected={selectedSet.has(getAnimeTitle(item, "zh"))}
            onToggle={onToggle}
          />
        ))}
        {Array.from({ length: TOP_N - items.length }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-[3/4] bg-zinc-50" />
        ))}
      </div>
    </section>
  )
}

function AnimeCard({
  year,
  item,
  language,
  selected,
  onToggle,
}: {
  year: string
  item: AnimeItem
  language: Language
  selected: boolean
  onToggle: (key: string) => void
}) {
  const key = getAnimeTitle(item, "zh")
  const name = getAnimeTitle(item, language)
  const cover = getCover(year, item)

  return (
    <button
      type="button"
      aria-pressed={selected}
      title={name}
      onClick={() => onToggle(key)}
      className={`relative aspect-[3/4] overflow-hidden bg-zinc-100 transition-opacity hover:opacity-90 ${
        selected ? "ring-2 ring-inset ring-green-500" : ""
      }`}
    >
      {cover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.cover}
            alt={name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/85 to-transparent px-1 pb-1 pt-6 text-left text-[11px] leading-tight text-white">
            {name}
          </span>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center p-1.5 text-center text-xs leading-tight text-zinc-700">
          <span className="line-clamp-4">{name}</span>
        </span>
      )}
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center bg-green-500/50">
          <span className="rounded-full bg-white px-2 py-0.5 text-sm font-bold text-green-600">
            ✓
          </span>
        </span>
      )}
    </button>
  )
}
