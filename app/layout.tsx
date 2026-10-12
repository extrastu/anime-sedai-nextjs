import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Baloo_2 } from "next/font/google"
import "./globals.css"
import { SITE_URL } from "@/lib/site"
import { Analytics } from "@vercel/analytics/next"

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-baloo",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: { google: "fmgce_RNpeUSw6KWbPoH5ifqwZ1LL_cXuQ2Huac8ttE" },
  title: {
    default: "动画世代 | Anime Sedai",
    template: "%s | 动画世代",
  },
  description:
    "回顾 2006 至 2025 年每年 bgm.tv 关注度最高的动画，附 Bangumi 封面。点击标记你看过的作品，一键生成锐评提示词或图片。",
  applicationName: "动画世代",
  keywords: ["动画", "动漫", "年度动画", "bgm.tv", "Bangumi", "番剧", "观看记录", "anime"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff4dd" },
    { media: "(prefers-color-scheme: dark)", color: "#2b2620" },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={baloo.variable}>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
