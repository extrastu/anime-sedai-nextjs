import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "动画世代 | Anime Sedai",
    template: "%s | 动画世代",
  },
  description:
    "回顾 2006 至 2025 年每年 bgm.tv 关注度最高的动画，附 Bangumi 封面。点击标记你看过的作品，一键生成锐评提示词或图片。",
  applicationName: "动画世代",
  keywords: [
    "动画",
    "动漫",
    "年度动画",
    "bgm.tv",
    "Bangumi",
    "番剧",
    "观看记录",
    "anime",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "动画世代",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  )
}
