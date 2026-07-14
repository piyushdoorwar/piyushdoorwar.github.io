// Build-time analytics fetcher.
//
// Reads the stat-source slugs declared in src/data/projects.ts, fetches live
// aggregate numbers (GitHub stars/release downloads and VS Code Marketplace
// installs), and writes src/data/stats.generated.json.
//
// Runs in the GitHub Action (Node, no CORS limits). Fail-soft: any source that
// errors resolves to null and logs a warning. If one source in an aggregate
// category fails, the last committed total survives instead of shrinking.
//
// Env: GITHUB_TOKEN (optional but recommended to avoid GitHub rate limits).

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const PROJECTS_TS = join(root, 'src/data/projects.ts')
const OUT = join(root, 'src/data/stats.generated.json')

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
    return { totals: {} }
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

async function githubStars(repo) {
  return safe(`github ${repo}`, async () => {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.stargazers_count ?? null
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

function aggregateOrPrevious(values, previous) {
  if (!values.length) return null
  if (values.every((value) => typeof value === 'number')) {
    return values.reduce((total, value) => total + value, 0)
  }
  return typeof previous === 'number' ? previous : null
}

async function main() {
  const projects = await loadProjects()
  const previous = await loadPrevious()
  const githubRepos = [
    ...new Set(projects.map((project) => project.stats?.githubRepo).filter(Boolean)),
  ]
  const vscodeExtensions = [
    ...new Set(projects.map((project) => project.stats?.vscodeExtension).filter(Boolean)),
  ]

  const [stars, downloads, installs] = await Promise.all([
    Promise.all(githubRepos.map(githubStars)),
    Promise.all(githubRepos.map(githubReleaseDownloads)),
    Promise.all(vscodeExtensions.map(vscodeInstalls)),
  ])

  const out = {
    generatedAt: new Date().toISOString(),
    totals: {
      stars: aggregateOrPrevious(stars, previous.totals?.stars),
      installs: aggregateOrPrevious(installs, previous.totals?.installs),
      downloads: aggregateOrPrevious(downloads, previous.totals?.downloads),
    },
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log('✅ wrote', OUT)
  console.log(JSON.stringify(out.totals))
}

main().catch((err) => {
  // Never fail the build on a stats error — keep whatever JSON already exists.
  console.error('stats fetch failed, keeping existing stats.generated.json:', err.message)
  process.exit(0)
})
