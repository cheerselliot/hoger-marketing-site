# Hoger marketing site

Static landing page for [hoger.ai](https://hoger.ai/), deployed to Netlify.

## Local preview

```bash
cd marketing-site
npx serve .
# or: python3 -m http.server 8080
```

Waitlist submit needs Netlify Functions locally:

```bash
npx netlify dev
```

## Netlify deploy

1. Connect this `marketing-site/` folder (or repo) to Netlify.
2. Build settings: publish directory `.`, no build command (see `netlify.toml`).
3. Set environment variable:
   - `BUTTONDOWN_API_KEY` — same value as landing-platform (see `Scripts/landing-platform/.dev.vars` or Worker secret).
4. Optional: set `REDDIT_PIXEL_ID` in `index.html` `window.__HOGER__.redditPixelId` when running Reddit ads.

## Stack

- Static HTML/CSS/JS
- [Luxon](https://moment.github.io/luxon/) (CDN) — launch countdown in viewer local timezone (source: Sept 15 2026 00:00 Australia/Sydney)
- PostHog — same project as landing-platform
- Buttondown — via `netlify/functions/subscribe.js`

## Assets

- `assets/bg-plexus.webp` — optimized background from reference art
- `assets/og-image.jpg` — 1200×630 for OG/Twitter/Reddit ads
- `logo.svg` / `favicon.svg` — brain mark from prototype, emerald recolor
