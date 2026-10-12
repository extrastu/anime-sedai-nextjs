# 动画世代 (Next.js)

Next.js (App Router) rewrite of [egoist/anime-sedai](https://github.com/egoist/anime-sedai) (MIT).
Adds Bangumi cover art, responsive layout, per-year static pages and SEO metadata.

## Setup

```bash
npm install
npm run fetch-covers   # fills data/covers.json from the Bangumi API (run once, re-runnable)
npm run dev
```

`fetch-covers` calls `https://api.bgm.tv`. Set a descriptive User-Agent:

```bash
BGM_USER_AGENT="anime-sedai-nextjs/0.1 (https://github.com/you/repo)" npm run fetch-covers
```

Entries without a match are listed at the end of the run; they fall back to a text tile.

## Production

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build
npm start
```

`NEXT_PUBLIC_SITE_URL` drives canonical URLs, `sitemap.xml`, `robots.txt` and Open Graph tags.

## Layout

- `app/page.tsx` — interactive wall (client component `components/AnimeSedai.tsx`), SSR'd with all titles and covers
- `app/[year]/page.tsx` — static page per year (SEO)
- `data/anime-data.ts` — original dataset (2006–2025, top 12 per year)
- `data/covers.json` — generated Bangumi cover map, keyed `"<year>:<titleZh>"`
- `lib/i18n.ts` — original translations and AI prompt templates

## Notes

- Covers are hot-linked from Bangumi's CDN. Check Bangumi's terms before a commercial launch.
- The original's analytics and AdSense tags are not included.
