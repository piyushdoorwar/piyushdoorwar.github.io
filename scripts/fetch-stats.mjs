// Build-time analytics fetcher.
//
// Reads the stat-source slugs declared in src/data/projects.ts, fetches live
// numbers (GitHub stars/forks/release-downloads, VS Code Marketplace installs,
// Chrome Web Store users/ratings, npm monthly downloads) and writes
// src/data/stats.generated.json.
//
// Runs in the GitHub Action (Node, no CORS limits). Fail-soft: any source that
// errors resolves to null and logs a warning — a flaky API never breaks the build.
//
// Env: GITHUB_TOKEN (optional but recommended to avoid GitHub rate limits).

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const PROJECTS_TS = join(root, 'src/data/projects.ts')
const OUT = join(root, 'src/data/stats.generated.json')
const GITHUB_USER = 'piyushdoorwar'

const gh = process.env.GITHUB_TOKEN
const ghHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'portfolio-stats',
  ...(gh ? { Authorization: `Bearer ${gh}` } : {}),
}

/** Extract the `projects` array literal from the TS source and evaluate it. */
async function loadProjects() {
  const src = await readFile(PROJECTS_TS, 'utf8')
  const marker = src.indexOf('export const projects')
  if (marker === -1) throw new Error('Could not find `export const projects` in projects.ts')
  const eq = src.indexOf('=', marker)
  const arrayText = src.slice(eq + 1).trim().replace(/;?\s*$/, '')
  // Trusted, first-party file containing plain object literals.
  const fn = new Function(`return (${arrayText})`)
  return fn()
}

async function loadPrevious() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'))
  } catch {
    return { github: {}, projects: {} }
  }
}

async function safe(label, fn) {
  try {
    return await fn()
  } catch (err) {
    console.warn(`⚠️  ${label}: ${err.message}`)
    return null
  }
}

async function githubRepo(repo) {
  return safe(`github ${repo}`, async () => {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return { stars: json.stargazers_count ?? null, forks: json.forks_count ?? null }
  })
}

async function githubReleaseDownloads(repo) {
  return safe(`releases ${repo}`, async () => {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, {
      headers: ghHeaders,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const releases = await res.json()
    let total = 0
    for (const rel of releases) for (const a of rel.assets ?? []) total += a.download_count ?? 0
    return total
  })
}

async function githubFollowers(user) {
  return safe(`followers ${user}`, async () => {
    const res = await fetch(`https://api.github.com/users/${user}`, { headers: ghHeaders })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.followers ?? null
  })
}

async function vscodeInstalls(extensionId) {
  return safe(`vscode ${extensionId}`, async () => {
    const res = await fetch(
      'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json;api-version=7.2-preview.1',
          'Content-Type': 'application/json',
          'User-Agent': 'portfolio-stats',
        },
        body: JSON.stringify({
          filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
          flags: 914, // include statistics
        }),
      },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const ext = json?.results?.[0]?.extensions?.[0]
    const stat = ext?.statistics?.find((s) => s.statisticName === 'install')
    return stat?.value != null ? Math.round(stat.value) : null
  })
}

function parseStoreCount(raw) {
  const match = raw.trim().replace(/,/g, '').match(/^([\d.]+)([KMB])?\+?$/i)
  if (!match) return null
  const scales = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }
  const scale = match[2] ? scales[match[2].toUpperCase()] : 1
  return Math.round(Number(match[1]) * scale)
}

/**
 * The Chrome Web Store has no public statistics API. Its public listing does
 * include these values in the initial HTML, so fetch them at build time. Keep
 * this fail-soft: the previous generated values survive if Google's markup
 * changes or the listing is temporarily unavailable.
 */
async function chromeWebStoreStats(extensionId) {
  return safe(`chrome web store ${extensionId}`, async () => {
    const res = await fetch(`https://chromewebstore.google.com/detail/${extensionId}`, {
      headers: {
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'portfolio-stats',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // Anchor parsing around this extension's reviews link so ratings from the
    // recommendation cards further down the page cannot be mistaken for it.
    const reviewsAt = html.indexOf(`/${extensionId}/reviews`)
    if (reviewsAt === -1) throw new Error('listing statistics not found')
    const beforeReviews = html.slice(Math.max(0, reviewsAt - 5_000), reviewsAt)
    const afterReviews = html.slice(reviewsAt, reviewsAt + 12_000)

    const ratingMatches = [...beforeReviews.matchAll(/<span class="Vq0ZA">([\d.]+)<\/span>/g)]
    const ratingRaw = ratingMatches.at(-1)?.[1]
    const ratingCountRaw = afterReviews.match(/>([\d,.]+(?:[KMB])?\+?)\s+ratings?<\/p>/i)?.[1]
    const usersRaw = afterReviews.match(/([\d,.]+(?:[KMB])?\+?)\s+users<\/div>/i)?.[1]

    const rating = ratingRaw == null ? null : Number(ratingRaw)
    const ratingCount = ratingCountRaw == null ? null : parseStoreCount(ratingCountRaw)
    const users = usersRaw == null ? null : parseStoreCount(usersRaw)
    if (rating == null || ratingCount == null || users == null) {
      throw new Error('could not parse listing statistics')
    }
    return { users, rating, ratingCount }
  })
}

async function npmDownloads(pkg) {
  return safe(`npm ${pkg}`, async () => {
    const res = await fetch(`https://api.npmjs.org/downloads/point/last-month/${pkg}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.downloads ?? null
  })
}

const sum = (values) => {
  const nums = values.filter((v) => typeof v === 'number')
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null
}

async function main() {
  const projects = await loadProjects()
  const previous = await loadPrevious()
  const followers = await githubFollowers(GITHUB_USER)
  const out = {
    generatedAt: new Date().toISOString(),
    github: { followers: followers ?? previous.github?.followers ?? null },
    projects: {},
    totals: { stars: null, installs: null, downloads: null },
  }

  const allStars = []
  const allInstalls = []
  const allDownloads = []

  for (const p of projects) {
    const s = p.stats
    if (!s) continue
    const entry = {}

    if (s.githubRepo) {
      const repo = await githubRepo(s.githubRepo)
      if (repo) {
        entry.stars = repo.stars
        entry.forks = repo.forks
      }
      const dl = await githubReleaseDownloads(s.githubRepo)
      if (dl != null) entry.downloads = dl
    }
    if (s.vscodeExtension) {
      const installs = await vscodeInstalls(s.vscodeExtension)
      if (installs != null) entry.installs = installs
    }
    if (s.chromeWebStoreId) {
      const store = await chromeWebStoreStats(s.chromeWebStoreId)
      if (store) Object.assign(entry, store)
    }
    if (s.npmPackage) {
      const nd = await npmDownloads(s.npmPackage)
      if (nd != null) entry.npmDownloads = nd
    }

    // Retain last-known values for a configured source when an API request or
    // public-page parse fails. A flaky refresh must never erase good data.
    const previousEntry = previous.projects?.[p.id] ?? {}
    const preserve = []
    if (s.githubRepo) preserve.push('stars', 'forks', 'downloads')
    if (s.vscodeExtension) preserve.push('installs')
    if (s.chromeWebStoreId) preserve.push('users', 'rating', 'ratingCount')
    if (s.npmPackage) preserve.push('npmDownloads')
    for (const key of preserve) {
      if (entry[key] == null && previousEntry[key] != null) entry[key] = previousEntry[key]
    }

    if (Object.keys(entry).length) {
      out.projects[p.id] = entry
      if (entry.stars != null) allStars.push(entry.stars)
      if (entry.installs != null) allInstalls.push(entry.installs)
      if (entry.downloads != null) allDownloads.push(entry.downloads)
      if (entry.npmDownloads != null) allDownloads.push(entry.npmDownloads)
    }
  }

  out.totals.stars = sum(allStars)
  out.totals.installs = sum(allInstalls)
  out.totals.downloads = sum(allDownloads)

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log('✅ wrote', OUT)
  console.log(JSON.stringify(out.totals))
}

main().catch((err) => {
  // Never fail the build on a stats error — keep whatever JSON already exists.
  console.error('stats fetch failed, keeping existing stats.generated.json:', err.message)
  process.exit(0)
})
