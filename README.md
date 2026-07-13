# piyushdoorwar.github.io

Personal portfolio of **Piyush Doorwar** — backend engineer, builder, musician.

Built with **React + Vite + TypeScript** and **Tailwind CSS**, deployed to GitHub Pages via
GitHub Actions. Project analytics (GitHub stars, VS Code Marketplace installs, release/npm
downloads) are fetched at build time and baked into the static site.

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
| `projects.ts` | Projects + their stat sources (GitHub repo / VS Code ext / npm pkg) |
| `writing.ts` | Medium articles and books |
| `music.ts` | Spotify / YouTube Music links and an optional Spotify embed |

Search for `TODO` — those mark values to confirm (repo slugs, marketplace ids, music URLs,
resume PDF, OG image).

## Analytics

`scripts/fetch-stats.mjs` reads the stat-source slugs from `projects.ts`, fetches live numbers and
writes `src/data/stats.generated.json`. Run it locally with:

```bash
npm run fetch-stats
```

It fails soft: any source that errors resolves to `—` on the site and the existing JSON is kept.
Set `GITHUB_TOKEN` to avoid GitHub API rate limits (the Action sets this automatically).

## Deployment

1. This must live in a repo named **`piyushdoorwar.github.io`** (rename this repo or push to a new
   one) so it serves at the root URL.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The workflow (`.github/workflows/deploy.yml`) fetches stats, builds and deploys.
   It also re-runs daily to refresh stats, and can be triggered manually from the Actions tab.

Live at **https://piyushdoorwar.github.io** once deployed.
