// Build-time Cloudflare Web Analytics fetcher.
//
// Fetches a rolling 30-day visit/page-view snapshot grouped by country and
// writes src/data/traffic.generated.json. The API token is used only by this
// Node process (normally GitHub Actions) and is never included in the site.
//
// The committed JSON is an offline seed. Missing credentials or an API error
// preserve that seed/last good snapshot so local development and deploys keep
// working.
//
// Env:
//   CLOUDFLARE_API_TOKEN  Account Analytics: Read token
//   CLOUDFLARE_ACCOUNT_ID Cloudflare account identifier
//   CLOUDFLARE_SITE_TAG   Web Analytics site tag shown in the dashboard URL

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import iso from 'iso-3166-1'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../src/data/traffic.generated.json')
const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'
const PERIOD_DAYS = 30

const token = process.env.CLOUDFLARE_API_TOKEN
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const siteTag = process.env.CLOUDFLARE_SITE_TAG

const QUERY = `
  query PortfolioTraffic(
    $accountTag: string!
    $siteTag: string!
    $start: Time!
    $end: Time!
  ) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        totals: rumPageloadEventsAdaptiveGroups(
          limit: 1
          filter: {
            datetime_geq: $start
            datetime_leq: $end
            siteTag: $siteTag
            bot: 0
          }
        ) {
          count
          sum { visits }
        }
        countries: rumPageloadEventsAdaptiveGroups(
          limit: 250
          orderBy: [count_DESC]
          filter: {
            datetime_geq: $start
            datetime_leq: $end
            siteTag: $siteTag
            bot: 0
          }
        ) {
          count
          sum { visits }
          dimensions { countryName }
        }
      }
    }
  }
`

async function loadPrevious() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'))
  } catch {
    return null
  }
}

function metricsEqual(left, right) {
  if (!left || !right) return false
  return JSON.stringify({ totals: left.totals, countries: left.countries }) ===
    JSON.stringify({ totals: right.totals, countries: right.countries })
}

function countryName(code, fallback) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? fallback
  } catch {
    return fallback
  }
}

function countryRecord(row) {
  const code = String(row?.dimensions?.countryName ?? '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null

  const match = iso.whereAlpha2(code)
  if (!match) return null

  return {
    code,
    numericCode: match.numeric,
    name: countryName(code, match.country),
    visits: Math.max(0, Math.round(row?.sum?.visits ?? 0)),
    pageViews: Math.max(0, Math.round(row?.count ?? 0)),
  }
}

async function fetchTraffic() {
  const end = new Date()
  const start = new Date(end.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000)
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        accountTag: accountId,
        siteTag,
        start: start.toISOString(),
        end: end.toISOString(),
      },
    }),
  })

  if (!response.ok) throw new Error(`Cloudflare returned HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '))
  }

  const account = payload.data?.viewer?.accounts?.[0]
  if (!account) throw new Error('Cloudflare returned no analytics account data')

  const countries = (account.countries ?? [])
    .map(countryRecord)
    .filter(Boolean)
    .filter((country) => country.visits > 0 || country.pageViews > 0)
    .sort((left, right) => right.visits - left.visits || right.pageViews - left.pageViews)

  const total = account.totals?.[0]
  return {
    generatedAt: end.toISOString(),
    periodDays: PERIOD_DAYS,
    totals: {
      visits: Math.max(0, Math.round(total?.sum?.visits ?? 0)),
      pageViews: Math.max(0, Math.round(total?.count ?? 0)),
    },
    countries,
  }
}

async function main() {
  const previous = await loadPrevious()
  if (!token || !accountId || !siteTag) {
    console.warn('Cloudflare analytics credentials are not configured; preserving traffic snapshot.')
    return
  }

  try {
    const next = await fetchTraffic()
    if (metricsEqual(next, previous)) {
      console.log('✅ traffic metrics are unchanged; preserving the existing snapshot timestamp')
      return
    }

    await writeFile(OUT, `${JSON.stringify(next, null, 2)}\n`)
    console.log('✅ wrote', OUT)
    console.log(JSON.stringify(next.totals))
  } catch (error) {
    console.warn(`Cloudflare traffic fetch failed; preserving existing snapshot: ${error.message}`)
  }
}

main()
