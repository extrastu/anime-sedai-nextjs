# 动画世代 · Anime Sedai

回顾 2006 至 2025 年每年 [bgm.tv](https://bgm.tv)（番组计划）关注度最高的前 12 部电视动画，封面来自 [Bangumi](https://bangumi.tv)。

在线体验：[sedaiwall.vercel.app](https://sedaiwall.vercel.app/)

这是 [egoist/anime-sedai](https://github.com/egoist/anime-sedai)（MIT）的 Next.js 重制版，增加了动画封面、响应式布局和 SEO 优化。

## 功能

- **封面墙**：按年份浏览榜单，点击标记看过的作品，进度实时统计
- **年份范围**：最近 5 / 10 / 15 年或全部
- **显示切换**：封面、文字、表格三种视图
- **多语言**：中文、English、日本語
- **导出分享**：复制或下载榜单图片（未看过的作品会自动加蒙层）
- **锐评提示词**：根据观看记录生成提示词，可一键复制，或直接在 ChatWise / Claude / ChatGPT 中打开
- **深色模式**：跟随系统，也可手动切换
- **SEO**：每年一个静态页面，附 Open Graph、结构化数据、sitemap 与 robots

## 快速开始

环境要求：Node.js 20 及以上。

```bash
npm install
npm run fetch-covers   # 从 Bangumi API 拉取封面，写入 data/covers.json（可重复执行）
npm run dev            # http://localhost:3000
```

`fetch-covers` 会请求 `https://api.bgm.tv`，建议设置一个能标识你的 User-Agent：

```bash
BGM_USER_AGENT="anime-sedai-nextjs/0.1 (https://github.com/your-name/your-repo)" npm run fetch-covers
```

没有匹配到封面的作品会在运行结束时列出，并以文字卡片显示。

## 部署

以 Vercel 为例：导入仓库后，在构建时设置站点地址（不设置时，canonical、Open Graph、sitemap 和 robots 会指向 localhost）：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

本地构建和启动：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build
npm start
```

## 环境变量

| 变量 | 作用 | 默认值 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 站点地址，用于 canonical、Open Graph、`sitemap.xml`、`robots.txt` | `http://localhost:3000` |
| `BGM_USER_AGENT` | 请求 Bangumi API 和封面代理时使用的 User-Agent | `anime-sedai-nextjs/0.1` |

## 项目结构

```
app/
  page.tsx            首页：封面墙 + 历年索引 + 关于
  [year]/page.tsx     每年一个静态页面（SEO）
  api/cover/route.ts  封面代理（仅允许 lain.bgm.tv，用于导出图片）
  sitemap.ts          sitemap.xml
  robots.ts           robots.txt
components/
  AnimeSedai.tsx      交互式封面墙（客户端组件）
  YearIndex.tsx       历年索引
data/
  anime-data.ts       原始数据集（2006–2025，每年前 12 名）
  covers.json         Bangumi 封面映射，键为 "<年份>:<中文名>"
lib/
  i18n.ts             多语言文案与锐评提示词模板
  anime.ts            数据访问与封面查找
  site.ts             站点地址
scripts/
  fetch-covers.ts     封面抓取脚本
```

## 注意事项

- 封面通过 Bangumi 的 CDN 直接引用，商业使用前请确认 Bangumi 的使用条款。
- 原项目的统计和广告代码未包含在本项目中。

## 致谢

- 原项目 [egoist/anime-sedai](https://github.com/egoist/anime-sedai)，数据和提示词模板来自原项目
- 数据来源 [bgm.tv](https://bgm.tv)，封面来源 [Bangumi](https://bangumi.tv)

## 作者

由 [@extrastu](https://x.com/iextrastu) 制作。

## 许可

[MIT](./LICENSE)
