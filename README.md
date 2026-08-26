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
4. Set `redditPixelId` in `index.html` `window.__HOGER__` to your Reddit Ads pixel ID (Events Manager). Waitlist signups fire a `SignUp` conversion event.

## Custom domain (`hoger.ai`)

Canonical, OG, sitemap, and robots already use `https://hoger.ai/`.

1. In Netlify: **Domain management → Add a domain** → `hoger.ai` (and `www.hoger.ai`).
2. Set **Primary domain** to `hoger.ai` (HTTPS automatic).
3. At the registrar, either:

**Netlify DNS (simplest):** copy Netlify’s nameservers into the registrar.

**External DNS:** keep the registrar’s nameservers and add:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `75.2.60.5` |
| CNAME | `www` | `hoger.netlify.app` |

`netlify.toml` 301s `www.hoger.ai` and `hoger.netlify.app` to `https://hoger.ai/`.

## Stack

- Static HTML/CSS/JS
- [Luxon](https://moment.github.io/luxon/) (CDN) — launch countdown in viewer local timezone (source: Sept 30 2026 00:00 Australia/Sydney)
- PostHog — same project as landing-platform
- Buttondown — via `netlify/functions/subscribe.js`

## Assets

- `assets/bg-plexus.webp` — optimized background from reference art
- `assets/og-image.jpg` — 1200×630 for OG/Twitter/Reddit ads
- `logo.svg` / `favicon.svg` — brain mark from prototype, emerald recolor
