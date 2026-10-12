"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, ReactNode, SetStateAction } from "react"
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
type ThemeMode = "system" | "light" | "dark"
type DisplayMode = "cover" | "text"
type TranslationKey = keyof typeof translations.zh

const YEAR_RANGE_KEY: Record<YearRange, TranslationKey> = {
  "5": "last5Years",
  "10": "last10Years",
  "15": "last15Years",
  all: "allYears",
}
const LANGUAGES: { value: Language; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "EN" },
  { value: "ja", label: "日本語" },
]
const THEMES: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "自动" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
]
const FOOTER: Record<Language, [string, string, string]> = {
  zh: ["数据来源 bgm.tv，封面来自 Bangumi。基于 ", "egoist/anime-sedai", " (MIT) 重制"],
  en: ["Data from bgm.tv, covers from Bangumi. Rebuilt from ", "egoist/anime-sedai", " (MIT)"],
  ja: ["データソース：bgm.tv、カバー：Bangumi。", "egoist/anime-sedai", " (MIT) をもとに作成"],
}

/**
 * Export-only: marks the wall as `.exporting` (CSS hides the check badges, removes
 * selection dimming and shows masks on unselected covers), and points Bangumi
 * covers at the same-origin proxy so they are embedded in the PNG. Everything is
 * restored afterwards.
 */
async function withExportMode<T>(root: HTMLElement, run: () => Promise<T>): Promise<T> {
  const imgs = [...root.querySelectorAll<HTMLImageElement>("img")]
  const originals = imgs.map((img) => img.getAttribute("src"))
  imgs.forEach((img, i) => {
    const src = originals[i]
    if (src?.startsWith("https://lain.bgm.tv/")) {
      img.src = `/api/cover?u=${encodeURIComponent(src)}`
    }
  })
  root.classList.add("exporting")
  try {
    return await run()
  } finally {
    root.classList.remove("exporting")
    imgs.forEach((img, i) => {
      const src = originals[i]
      if (src) img.setAttribute("src", src)
    })
  }
}

/**
 * Copy plain text. Prefers the async Clipboard API; falls back to execCommand,
 * which still works on http/LAN origins and older Safari where the API is missing or rejects.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, text.length)
    const ok = document.execCommand("copy")
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/** localStorage-backed state. Reads after mount so SSR and hydration match. */
function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
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
  const [theme, setTheme] = useStoredState<ThemeMode>("theme", "system")
  const [display, setDisplay] = useStoredState<DisplayMode>("displayMode", "cover")
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
    const root = document.documentElement
    if (theme === "system") root.removeAttribute("data-theme")
    else root.setAttribute("data-theme", theme)
  }, [theme])

  const visibleYears = useMemo(
    () => (yearRange === "all" ? allYears : allYears.slice(-Number(yearRange))),
    [yearRange]
  )

  // Selection is keyed by the Chinese title, as in the original app.
  const visibleKeys = useMemo(
    () =>
      visibleYears.flatMap((year) =>
        (animeData[year] ?? []).slice(0, TOP_N).map((item) => getAnimeTitle(item, "zh"))
      ),
    [visibleYears]
  )
  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys])
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const watchedCount = visibleKeys.filter((key) => selectedSet.has(key)).length
  const total = visibleKeys.length
  const percent = total ? Math.round((watchedCount / total) * 100) : 0

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  const selectAll = () =>
    setSelected((prev) => [...prev.filter((k) => !visibleKeySet.has(k)), ...visibleKeys])
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
    const root = captureRef.current
    if (!root) throw new Error(t("unknownError"))
    const blob = await withExportMode(root, () =>
      domToBlob(root, {
        scale: 2,
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains("remove")),
      })
    )
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

  const copyPrompt = async () => {
    const ok = await copyText(prompt)
    if (ok) toast.success(t("copySuccess"))
    else toast.error(t("copyFailed", { error: t("unknownError") }))
  }

  const [before, link, after] = FOOTER[language]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6">
      <Toaster />

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* same mark as app/icon.svg (favicon) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={48} height={48} className="size-12 shrink-0" />
          <div>
            <p className="font-display text-3xl font-extrabold leading-none">{t("title")}</p>
            <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label={t("language")}
            value={language}
            options={LANGUAGES}
            onChange={setLanguage}
          />
          <Segmented label="主题" value={theme} options={THEMES} onChange={setTheme} />
        </div>
      </header>

      {/* Hero: progress sticker, mirrors the reference's "latest reset" card */}
      <section className="dot-grid relative overflow-hidden rounded-[14px] border-2 border-ink bg-card p-6 shadow-hard-lg sm:p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          {t("watched")}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <span className="inline-block -rotate-2 rounded-xl border-2 border-ink bg-sun px-5 py-2 font-display text-6xl font-extrabold leading-none text-on-pastel shadow-hard sm:text-7xl">
            <Count value={watchedCount} />
            <span className="text-3xl sm:text-4xl"> / <Count value={total} /></span>
          </span>
          <span className="pb-2 font-display text-2xl font-bold text-ink-2"><Count value={percent} />%</span>
        </div>
        <div className="mt-6 h-4 w-full overflow-hidden rounded-full border-2 border-ink bg-empty">
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <ActionButton variant="accent" onClick={() => {
            void copyPrompt()
          }}>
            {t("copy")} · {t("promptType")}
          </ActionButton>
          <ActionButton onClick={selectAll}>{t("selectAll")}</ActionButton>
          {watchedCount > 0 && <ActionButton onClick={clearVisible}>{t("clear")}</ActionButton>}
        </div>
      </section>

      {/* Stat tiles, mirrors the reference's coloured stat row */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile tone="bg-sun" label={t("watched")} value={watchedCount} />
        <StatTile tone="bg-rose" label={t("yearRange")} value={visibleYears.length} unit={t("year")} />
        <StatTile tone="bg-sky" label={t("notWatched")} value={total - watchedCount} />
      </section>

      {/* Controls */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="显示"
          value={display}
          options={[
            { value: "cover" as DisplayMode, label: "封面" },
            { value: "text" as DisplayMode, label: "文字" },
          ]}
          onChange={setDisplay}
        />
        <Segmented
          label={t("yearRange")}
          value={yearRange}
          options={(["5", "10", "15", "all"] as YearRange[]).map((value) => ({
            value,
            label: t(YEAR_RANGE_KEY[value]),
          }))}
          onChange={setYearRange}
        />
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() =>
            toast.promise(copyImage(), {
              loading: t("copying"),
              success: t("copySuccess"),
              error: (error) => t("copyFailed", { error: errorText(error) }),
            })
          }>
            {t("copyImage")}
          </ActionButton>
          <ActionButton onClick={() =>
            toast.promise(downloadImage(), {
              loading: t("downloading"),
              success: t("downloadSuccess"),
              error: (error) => t("downloadFailed", { error: errorText(error) }),
            })
          }>
            {t("downloadImage")}
          </ActionButton>
        </div>
      </section>

      {/* Exportable wall */}
      <section
        ref={captureRef}
        className="w-full overflow-hidden rounded-[14px] border-2 border-ink bg-card shadow-hard"
      >
        <div className="flex flex-col gap-2 border-b-2 border-ink p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-bold">
            {t("title")}
            <span className="remove text-sm font-normal text-ink-2"> · {t("subtitle")}</span>
          </h2>
          <div className="flex items-center gap-3 text-xs text-ink-2">
            <Legend swatch="bg-mint" label={t("watched")} />
            <Legend swatch="bg-empty" label={t("notWatched")} />
          </div>
        </div>

        {visibleYears.map((year) => (
          <YearRow
            key={year}
            year={year}
            language={language}
            selectedSet={selectedSet}
            mode={display}
            onToggle={toggle}
          />
        ))}
      </section>

      {/* Prompt */}
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[14px] border-2 border-ink bg-card shadow-hard">
        <div className="flex flex-col gap-3 border-b-2 border-ink p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold">{t("promptType")}</span>
            <Segmented
              label={t("promptType")}
              value={promptType}
              options={[
                { value: "normal" as PromptType, label: t("promptNormal") },
                { value: "zako" as PromptType, label: t("promptZako") },
              ]}
              onChange={setPromptType}
            />
          </div>
          <div className="flex gap-2">
            <ActionButton small onClick={() => {
              void copyPrompt()
            }}>
              {t("copy")}
            </ActionButton>
            <ActionButton small onClick={() => {
              location.href = `chatwise://chat?input=${encodeURIComponent(prompt)}`
            }}>
              {t("openInChatWise")}
            </ActionButton>
          </div>
        </div>
        <textarea
          readOnly
          rows={10}
          value={prompt}
          className="w-full cursor-default resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
        />
      </section>

      <p className="text-center font-mono text-xs text-ink-3">
        {before}
        <a
          href="https://github.com/egoist/anime-sedai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          {link}
        </a>
        {after}
      </p>

      <p className="text-center font-mono text-xs text-ink-3">
        <a
          href="https://github.com/extrastu/anime-sedai-nextjs"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          GitHub
        </a>
        {" · Made by "}
        <a
          href="https://x.com/iextrastu"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          @extrastu
        </a>
      </p>
    </div>
  )
}

/* ---------- primitives ---------- */

/** Animates from the last shown value to `target`. Instant when reduced motion is on. */
function useCountUp(target: number, duration = 450): number {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    const from = shownRef.current
    if (from === target) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = target
      setShown(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const value = Math.round(from + (target - from) * eased)
      shownRef.current = value
      setShown(value)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return shown
}

function Count({ value }: { value: number }) {
  return <>{useCountUp(value)}</>
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap rounded-full border-2 border-ink bg-card p-0.5 shadow-hard-sm"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
              active ? "bg-ink text-paper" : "hover:bg-empty"
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  variant = "default",
  small,
}: {
  children: ReactNode
  onClick: () => void
  variant?: "default" | "accent"
  small?: boolean
}) {
  const tone =
    variant === "accent"
      ? "bg-accent text-on-accent"
      : "bg-card text-ink"
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press inline-flex items-center gap-2 rounded-full border-2 border-ink font-bold shadow-hard-sm ${tone} ${
        small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
      }`}
    >
      {children}
    </button>
  )
}

function StatTile({
  tone,
  label,
  value,
  unit,
}: {
  tone: string
  label: string
  value: number
  unit?: string
}) {
  return (
    <div className={`rounded-[14px] border-2 border-ink p-4 text-on-pastel shadow-hard-sm sm:p-5 ${tone}`}>
      <p className="font-mono text-[11px] uppercase tracking-wider opacity-80 sm:text-xs">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold leading-none sm:text-4xl">
        <Count value={value} />
        {unit && <span className="ml-1 text-base font-bold">{unit}</span>}
      </p>
    </div>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded-sm border-2 border-ink ${swatch}`} />
      {label}
    </span>
  )
}

function YearRow({
  year,
  language,
  selectedSet,
  mode,
  onToggle,
}: {
  year: string
  language: Language
  selectedSet: Set<string>
  mode: DisplayMode
  onToggle: (key: string) => void
}) {
  const items = (animeData[year] ?? []).slice(0, TOP_N)
  return (
    <section className="flex flex-col border-t-2 border-ink first:border-t-0 sm:flex-row">
      <h3 className="flex items-center justify-center bg-accent py-2 font-display text-lg font-extrabold text-on-accent sm:w-24 sm:shrink-0 sm:py-0">
        {year}
      </h3>
      <div className="grid flex-1 grid-cols-4 gap-2 p-2 sm:grid-cols-6 lg:grid-cols-12">
        {items.map((item) => (
          <AnimeCard
            key={item.titleZh}
            year={year}
            item={item}
            language={language}
            selected={selectedSet.has(getAnimeTitle(item, "zh"))}
            mode={mode}
            onToggle={onToggle}
          />
        ))}
        {Array.from({ length: TOP_N - items.length }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-[3/4] rounded-[10px] border-2 border-dashed border-ink-3/40"
          />
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
  mode,
  onToggle,
}: {
  year: string
  item: AnimeItem
  language: Language
  selected: boolean
  mode: DisplayMode
  onToggle: (key: string) => void
}) {
  const key = getAnimeTitle(item, "zh")
  const name = getAnimeTitle(item, language)
  const cover = getCover(year, item)
  const badge = (
    <span
      aria-hidden
      className={`anime-badge absolute -right-1 -top-1 grid size-7 -rotate-6 place-items-center rounded-full border-2 border-ink bg-sun font-display text-sm font-extrabold text-on-pastel shadow-hard-sm transition-[scale,opacity] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] motion-reduce:transition-none ${
        selected ? "scale-100 opacity-100" : "scale-0 opacity-0"
      }`}
    >
      ✓
    </span>
  )

  if (mode === "text") {
    // Text-only tile: the title sits in the box, no image. Selection = mint fill.
    return (
      <button
        type="button"
        aria-pressed={selected}
        title={name}
        onClick={() => onToggle(key)}
        className={`press relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[10px] border-2 border-ink p-2 text-center shadow-hard-sm ${
          selected ? "bg-mint text-on-pastel" : "bg-card text-ink"
        }`}
      >
        <span className="line-clamp-4 text-xs font-semibold leading-tight sm:text-sm">{name}</span>
        {badge}
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      title={name}
      onClick={() => onToggle(key)}
      className={`press group flex flex-col overflow-hidden rounded-[10px] border-2 border-ink shadow-hard-sm ${
        selected ? "bg-mint text-on-pastel" : "bg-card text-ink"
      }`}
    >
      {/* Cover only: the title lives below so it is never cut by the image box */}
      <span className="relative block aspect-[3/4] w-full overflow-hidden border-b-2 border-ink bg-empty">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.cover}
            alt={name}
            loading="lazy"
            decoding="async"
            className={`cover-img h-full w-full object-cover transition-[filter,opacity] duration-200 ${
              selected ? "opacity-60 saturate-50" : ""
            }`}
          />
        ) : (
          <span className="dot-grid block h-full w-full" />
        )}
        {!selected && <span className="export-mask" aria-hidden />}
        {badge}
      </span>
      {/* Reserve two lines so rows stay aligned; clamp instead of clipping mid-glyph */}
      <span className="block px-1.5 pb-2 pt-1.5 text-left text-[11px] font-semibold leading-tight sm:text-xs">
        <span className="line-clamp-2 block h-[2.5em]">{name}</span>
      </span>
    </button>
  )
}
