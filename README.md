# piyushdoorwar.github.io

Personal portfolio of **Piyush Doorwar** — backend engineer and builder.

Built with **React + Vite + TypeScript** and **Tailwind CSS**, deployed to GitHub Pages via
GitHub Actions. Project analytics (GitHub stars, VS Code Marketplace installs, release downloads)
and a rolling Cloudflare visitor footprint are fetched ahead of deployment and baked into the
static site.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the built site locally
```

## Editing content

All content lives in `src/data/` — no need to touch components:

| File | What it holds |
| --- | --- |
| `profile.ts` | Name, headline, bio, location, stack, social links, resume path |
| `experience.ts` | Work history cards (role, company, dates, highlights, logo, accent) |
| `projects.ts` | Projects + their stat sources (GitHub repo / VS Code ext / npm pkg) |
| `writing.ts` | Books (Medium articles are fetched automatically — see below) |
| `music.ts` | Tabbed player embeds (Spotify default / Apple Music) + platform header links |

Search for `TODO` — those mark values to confirm (repo slugs, marketplace ids, resume PDF,
OG image, and the experience titles/dates/highlights).

Company logos: drop SVGs in `public/logos/` and set each entry's `logo` field in `experience.ts`
(e.g. `logo: '/logos/studyin.svg'`). Until then, a monogram of the company initials is shown.

## Build-time data

Three scripts fetch live data and bake it into the build (run all with `npm run fetch-data`):

**`fetch-stats.mjs`** — reads stat-source slugs from `projects.ts` and fetches aggregate GitHub
stars/release downloads and VS Code Marketplace installs into `src/data/stats.generated.json`.
Set `GITHUB_TOKEN` to avoid rate limits (the Action sets it automatically).

**`fetch-traffic.mjs`** — queries the Cloudflare GraphQL Analytics API for visits, page views and
country codes and stores one snapshot per calendar month in `src/data/traffic.generated.json`. The
current month is fetched from its first day through now and replaced daily. When a new month starts,
previous months are retained without being fetched again. The map derives cumulative totals from all
stored months. The Cloudflare token is never sent to the browser. Configure
the repository secret `CLOUDFLARE_API_TOKEN` with **Account → Account Analytics → Read**, plus
repository variables `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_SITE_TAG`. Without them, the fetcher
preserves the committed snapshot.

**`fetch-medium.mjs`** — pulls the latest articles from the Medium RSS feed
(`medium.com/feed/@piyushdoorwar`) into `src/data/medium.generated.json`: title, date, tags,
subtitle and reading time. Articles are paginated on the site and sorted "best on top".

> **Claps & comments (optional):** Medium no longer exposes engagement numbers for free
> (its JSON endpoints are Cloudflare-blocked). To show 👏 claps and 💬 comments, add a
> [RapidAPI Medium API](https://rapidapi.com/nishujain199719-vgIfuFHZxVZ/api/medium2) key as the
> repo secret **`RAPIDAPI_MEDIUM_KEY`**. Without it, articles render newest-first with no counts.

All fetchers preserve their last committed JSON when an upstream API is unavailable, so a flaky
analytics source never blanks the static site.

## Deployment

1. This must live in a repo named **`piyushdoorwar.github.io`** (rename this repo or push to a new
   one) so it serves at the root URL.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. *(Visitor map)* Under **Settings → Secrets and variables → Actions**, add the secret
   `CLOUDFLARE_API_TOKEN` and variables `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_SITE_TAG`.
4. *(Optional, for claps/comments)* Add the repository secret `RAPIDAPI_MEDIUM_KEY` with your
   RapidAPI Medium API key.
5. Push to `main`. The deployment workflow builds using the committed generated JSON. Impact and
   traffic stats refresh daily at 10:17 UTC, while Medium data refreshes on the 3rd of each month at
   10:00 UTC. Both data workflows commit changed results, trigger deployment, and support manual
   runs. To test the visitor map immediately, open
   **Actions → Refresh impact and traffic stats → Run workflow**.

Live at **https://piyushdoorwar.github.io** once deployed.
