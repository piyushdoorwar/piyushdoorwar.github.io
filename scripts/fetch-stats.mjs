// Build-time analytics fetcher.
//
// Reads the stat-source slugs declared in src/data/projects.ts, fetches live
// numbers (GitHub stars/forks/release-downloads, VS Code Marketplace installs,
// npm monthly downloads) and writes src/data/stats.generated.json.
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
  const out = {
    generatedAt: new Date().toISOString(),
    github: { followers: await githubFollowers(GITHUB_USER) },
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
        if (repo.stars != null) allStars.push(repo.stars)
      }
      const dl = await githubReleaseDownloads(s.githubRepo)
      if (dl != null) {
        entry.downloads = dl
        allDownloads.push(dl)
      }
    }
    if (s.vscodeExtension) {
      const installs = await vscodeInstalls(s.vscodeExtension)
      if (installs != null) {
        entry.installs = installs
        allInstalls.push(installs)
      }
    }
    if (s.npmPackage) {
      const nd = await npmDownloads(s.npmPackage)
      if (nd != null) {
        entry.npmDownloads = nd
        allDownloads.push(nd)
      }
    }

    if (Object.keys(entry).length) out.projects[p.id] = entry
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
