# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Piyush Doorwar's personal portfolio — a single-page React + Vite + TypeScript site, deployed as a
**static** build to GitHub Pages. It must ultimately live in a repo named `piyushdoorwar.github.io`
(a user site served at the root), so `vite.config.ts` keeps `base: '/'` — do not add a base path.

## Commands

```bash
npm install          # first-time setup (creates package-lock.json used by CI's `npm ci`)
npm run dev          # dev server, pinned to http://localhost:5199 (see note below)
npm run build        # type-check app/config without emitting + vite build -> dist/
npm run preview      # serve the built dist/ locally
npm run fetch-stats  # regenerate src/data/stats.generated.json
npm run fetch-traffic # regenerate src/data/traffic.generated.json (requires Cloudflare env vars)
npm run fetch-medium # regenerate src/data/medium.generated.json
npm run enrich-medium # repair/fill article descriptions and tags on demand
npm run fetch-data   # run all data fetchers
```

There is **no test suite and no linter** configured. "Passing" means `npm run build` succeeds
(the two no-emit TypeScript checks are the type gate — treat type errors as build failures).

**Dev port is intentionally pinned** to `5199 --strictPort` in the `dev` script. The preview harness
launches `npm run dev` and proxies to the port declared in `.claude/launch.json` (5199); Vite's
`server.port` in `vite.config.ts` was silently ignored under that invocation, so the CLI flag is the
source of truth. Keep the script's port and `.claude/launch.json` in sync.

## Architecture

**Content is fully data-driven.** Every section renders from a plain data module in `src/data/`;
components in `src/components/` are presentational. To change site content, edit the data files —
not the components. `App.tsx` fixes the section order; `Nav.tsx` has its own `sections` list of
anchor ids that must be kept consistent with the sections actually rendered. Sections below the
hero are loaded through separate `React.lazy` boundaries; keep each Suspense fallback id aligned
with the section component id so navigation anchors remain available while a chunk loads.

Data modules and their consumers:
- `profile.ts` — identity, social links, grouped skills (About, Hero, Footer, Nav)
- `experience.ts` — work history; supports **multiple `positions` per company** (VISTRA, Infosys).
  The card headlines the most-recent role; the detail panel lists the full progression. Dates are
  `'YYYY-MM'` strings formatted to "July 2019" in `Experience.tsx`; durations are computed live so
  "Present" stays current. Each entry has an `accent` hex and an optional `logo` (see logos below).
- `projects.ts` — project copy, one canonical website per card, and the **aggregate stat-source
  slugs** (`githubRepo` / `vscodeExtension`) used by the impact section.
- `writing.ts` — imports `medium.generated.json` (articles) and holds hand-written `books`.
- `music.ts` — `musicEmbeds` (tabbed player, first entry is the default tab) + `musicLinks`
  (header icons). Spotify and Apple Music have player tabs; YouTube Music remains a header link to
  the full artist channel because it has no first-party channel embed.
- `stats.ts` / `stats.generated.json`, `traffic.ts` / `traffic.generated.json`,
  `medium.generated.json` — see "Build-time data" below.

**Build-time data fetching** (`scripts/*.mjs`, run in CI and committed as seed JSON so `npm run dev`
works offline):
- `fetch-stats.mjs` counts stars across all public GitHub repositories owned by `piyushdoorwar`.
  It evaluates the plain `projects` array literal from `projects.ts` (it cannot import TypeScript
  directly) to fetch release downloads and VS Code Marketplace installs. If any source fails, it
  keeps the last committed snapshot so a partial refresh cannot publish inconsistent totals.
- `fetch-traffic.mjs` queries account-scoped Cloudflare Web Analytics with a read-only token and
  stores one snapshot per calendar month. The current month is fetched from its first day through
  now and replaced daily; once a new month begins, previous months are retained without another API
  query. API queries are split into windows of at most 30 days. The UI derives cumulative country
  and visit totals from all stored months. Its token only exists in Node/GitHub Actions and must
  never be exposed through a `VITE_*` variable. Missing credentials or API failures preserve the
  committed snapshot used by `VisitorMap.tsx` beneath the impact cards.
- `fetch-medium.mjs` pulls the Medium RSS feed (the only free source — Medium's JSON endpoints and
  article pages are Cloudflare-blocked). Claps/comments are **optional** enrichment via RapidAPI,
  gated on the `RAPIDAPI_MEDIUM_KEY` env var; articles sort "best on top" (claps desc, else newest).
  It preserves last-known claps and enriched summaries from the existing JSON so a failed/keyless
  run never blanks them. `enrich-medium.mjs` is an on-demand historical metadata repair tool; it
  recovers article context through Jina Reader and fills meaningful summaries and topic tags.
- All fetchers are **fail-soft**: on error they log a warning and keep the existing JSON, and the
  UI renders `—` / hides missing values. Never let a data fetch break the build.

**Company logos** live in `public/logos/*.svg` and are rendered on a **white tile** in the
experience cards (logos ship in mixed brand colors, some dark, so the tile guarantees contrast).
`experience.ts` entries without a `logo` fall back to an initials monogram.

## Theme

The page follows the OS light/dark setting (`prefers-color-scheme`); there is deliberately no
in-page toggle. The Hero terminal and its help dialog (`.portfolio-terminal`) always stay dark.
Colours are `@theme inline` tokens that read palette variables (`--surface`, `--heading`,
`--accent`, ...) declared on `:root, .portfolio-terminal` (dark) and overridden on `:root` in a
light media query, so never hardcode hex/`white/x` in components: use the tokens, `bg-overlay/x`
for neutral tints, and `text-on-accent` on accent fills. The canvas grid (`InteractiveGrid`) keeps
its own light/dark palette and listens for scheme changes.

Dark "developer/terminal" aesthetic with a flat, console-style finish: solid surfaces, 1px
accent-tinted hairlines, 6/8/12px radii (`rounded` / `rounded-card` / `rounded-panel`) and shallow
shadows — no glassy blur except the sticky top bar and modal scrims. Tailwind v4 is configured in
CSS: the `@theme inline` block in `src/index.css` defines the palette (`ink.*`, `surface.*`, `line.*`,
`heading` / `body` / `muted` text, `accent` neon green), and the same file holds the dark/light
palette variables and the shared component classes: `.section`/`.wrap`, `.eyebrow`, `.section-title`,
`.card`, `.panel`, `.icon-tile`, `.btn` + `.btn-primary`/`.btn-secondary`/`.btn-sm`, `.icon-btn`, `.nav-link`, `.tag`,
`.tag-button` (certified skills), `.pill`, `.badge`, `.segmented`/`.segment`. Reuse these rather than
restyling controls inline. `SectionHeading` renders the `// label` eyebrow, title, optional lede and
right-aligned actions. Fonts: DM Sans (`font-sans`, bundled 400–700 WOFF2, SIL OFL) for UI and body
text; JetBrains Mono (`font-mono`) for the brand handle, eyebrows, the terminal and stat numbers.
The Hero terminal's automatic platform detection and Linux/Apple/Windows/Android variants live in
`src/terminal/platformTheme.ts`; keep shell names, prompts, colors, and `neofetch`/`uname` labels
centralized there. macOS, iPhone, and iPad share the Apple variant because browser-reported platform
details are intentionally approximate and do not justify separate terminal chrome.
Completed terminal sessions are restored from the versioned, bounded local state managed by
`src/terminal/sessionPersistence.ts`. A saved session skips the intro typing animation; `clear` and
Ctrl+L remove that state, so refreshing an empty terminal replays the intro. Keep both clearing paths
wired through the shared reset function in `Hero.tsx`.
Terminal audio starts muted on every page load and is controlled only through `sound on`, `sound off`,
and `sound status`; keep these commands represented in autocomplete and the terminal help dialog.
Animations use `framer-motion` and respect `prefers-reduced-motion` throughout the site.
`MotionConfig` applies the user preference globally, reveal components skip their initial animation,
and `InteractiveGrid.tsx` immediately removes pointer deformation when reduced motion is enabled.

Static discovery/share assets live in `public/`: `robots.txt`, `sitemap.xml`, and the 1200×630
`og-image.png` generated from `og-image.svg`. Canonical, Open Graph, Twitter, and `ProfilePage` /
`Person` JSON-LD metadata live directly in `index.html` so crawlers receive them before React runs.

## Deployment

`.github/workflows/deploy.yml` builds and deploys on pushes to `main`, manual dispatch, when called
by another workflow, or after a successful Medium refresh. `.github/workflows/refresh-stats.yml`
checks impact and traffic stats daily at 10:17 UTC, commits only changed totals, and calls the
reusable deploy workflow after a change. `.github/workflows/refresh-medium.yml` refreshes and commits Medium data on
the 3rd of each month at 10:00 UTC. Both refresh workflows can also be run manually. Deployment uses
`actions/upload-pages-artifact@v5` + `actions/deploy-pages@v5` (these must track GitHub's current
major — v4 stopped resolving). Requires repo **Settings → Pages → Source: GitHub Actions**,
write-enabled workflow permissions, and the optional `RAPIDAPI_MEDIUM_KEY` secret for engagement.

## Content still marked TODO

Search for `TODO` across `src/data/` — remaining items include the resume PDF/OG image and social
profile confirmations. Verify facts against source (LinkedIn) before publishing; don't invent
employment history or stats.
