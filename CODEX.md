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
npm run build        # tsc -b (type-check) + vite build -> dist/
npm run preview      # serve the built dist/ locally
npm run fetch-stats  # regenerate src/data/stats.generated.json
npm run fetch-medium # regenerate src/data/medium.generated.json
npm run enrich-medium # repair/fill article descriptions and tags on demand
npm run fetch-data   # run both fetchers
```

There is **no test suite and no linter** configured. "Passing" means `npm run build` succeeds
(the `tsc -b` step is the type gate — treat type errors as build failures).

**Dev port is intentionally pinned** to `5199 --strictPort` in the `dev` script. The preview harness
launches `npm run dev` and proxies to the port declared in `.claude/launch.json` (5199); Vite's
`server.port` in `vite.config.ts` was silently ignored under that invocation, so the CLI flag is the
source of truth. Keep the script's port and `.claude/launch.json` in sync.

## Architecture

**Content is fully data-driven.** Every section renders from a plain data module in `src/data/`;
components in `src/components/` are presentational. To change site content, edit the data files —
not the components. `App.tsx` fixes the section order; `Nav.tsx` has its own `sections` list of
anchor ids that must be kept consistent with the sections actually rendered.

Data modules and their consumers:
- `profile.ts` — identity, social links, stack (About, Hero, Footer, Nav)
- `experience.ts` — work history; supports **multiple `positions` per company** (VISTRA, Infosys).
  The card headlines the most-recent role; the detail panel lists the full progression. Dates are
  `'YYYY-MM'` strings formatted to "July 2019" in `Experience.tsx`; durations are computed live so
  "Present" stays current. Each entry has an `accent` hex and an optional `logo` (see logos below).
- `projects.ts` — projects plus their **stat-source slugs** (`githubRepo` / `vscodeExtension` /
  `npmPackage`). The `id` maps a project to its entry in `stats.generated.json`.
- `writing.ts` — imports `medium.generated.json` (articles) and holds hand-written `books`.
- `music.ts` — `musicEmbeds` (tabbed player, first entry is the default tab) + `musicLinks`
  (header icons). Spotify and Apple Music have player tabs; YouTube Music remains a header link to
  the full artist channel because it has no first-party channel embed.
- `stats.ts` / `stats.generated.json`, `medium.generated.json` — see "Build-time data" below.

**Build-time data fetching** (`scripts/*.mjs`, run in CI and committed as seed JSON so `npm run dev`
works offline):
- `fetch-stats.mjs` reads the stat slugs **by regex-evaluating the `projects` array literal out of
  `projects.ts`** (it cannot import the TS/react-icons module). If you change the shape of
  `projects.ts`, verify this parser still works. Chrome Web Store users/ratings are parsed from the
  public listing HTML because Google exposes no public statistics API; last-known values survive
  markup or network failures.
- `fetch-medium.mjs` pulls the Medium RSS feed (the only free source — Medium's JSON endpoints and
  article pages are Cloudflare-blocked). Claps/comments are **optional** enrichment via RapidAPI,
  gated on the `RAPIDAPI_MEDIUM_KEY` env var; articles sort "best on top" (claps desc, else newest).
  It preserves last-known claps and enriched summaries from the existing JSON so a failed/keyless
  run never blanks them. `enrich-medium.mjs` is an on-demand historical metadata repair tool; it
  recovers article context through Jina Reader and fills meaningful summaries and topic tags.
- Both fetchers are **fail-soft**: on error they log a warning and keep the existing JSON, and the
  UI renders `—` / hides missing values. Never let a data fetch break the build.

**Company logos** live in `public/logos/*.svg` and are rendered on a **white tile** in the
experience cards (logos ship in mixed brand colors, some dark, so the tile guarantees contrast).
`experience.ts` entries without a `logo` fall back to an initials monogram.

## Theme

Dark "developer/terminal" aesthetic. Tailwind config (`tailwind.config.js`) defines the palette
(`ink.*` backgrounds, `accent` neon green, `cyanx`) and the `.section` / `.card` / `.tag` component
classes in `src/index.css`. Fonts: JetBrains Mono (`font-mono`) for labels/data, Inter for body.
Animations use `framer-motion`; respect `prefers-reduced-motion` (already handled in Hero/Counter).

## Deployment

`.github/workflows/deploy.yml` builds and deploys on pushes to `main`, manual dispatch, or after a
successful data refresh. `.github/workflows/refresh-stats.yml` refreshes and commits project stats
every Sunday at 10:00 UTC; `.github/workflows/refresh-medium.yml` refreshes and commits Medium data
on the 3rd of each month at 10:00 UTC. Both refresh workflows can also be run manually. Deployment
uses `actions/upload-pages-artifact@v5` + `actions/deploy-pages@v5` (these must track GitHub's
current major — v4 stopped resolving). Requires repo **Settings → Pages → Source: GitHub Actions**,
write-enabled workflow permissions, and the optional `RAPIDAPI_MEDIUM_KEY` secret for engagement.

## Content still marked TODO

Search for `TODO` across `src/data/` — remaining items include the resume PDF/OG image and social
profile confirmations. Verify facts against source (LinkedIn) before publishing; don't invent
employment history or stats.
