// Build-time Cloudflare Web Analytics fetcher.
//
// Stores traffic in calendar-month snapshots. Completed months are immutable;
// the current month is fetched from the first day through now and replaced on
// every daily run. The API token is used only by this Node process (normally
// GitHub Actions) and is never included in the site.
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
const DEFAULT_START_MONTH = '2026-01'
const QUERY_WINDOW_DAYS = 30

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
            datetime_lt: $end
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
            datetime_lt: $end
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
  return JSON.stringify(left.months) === JSON.stringify(right.months)
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

async function fetchWindow(start, end) {
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
  return account
}

function queryWindows(start, end) {
  const windows = []
  let cursor = start
  const windowMs = QUERY_WINDOW_DAYS * 24 * 60 * 60 * 1000

  while (cursor < end) {
    const windowEnd = new Date(Math.min(cursor.getTime() + windowMs, end.getTime()))
    windows.push({ start: cursor, end: windowEnd })
    cursor = windowEnd
  }

  return windows
}

async function fetchPeriod(start, end) {
  const countryTotals = new Map()
  let visits = 0
  let pageViews = 0

  for (const window of queryWindows(start, end)) {
    const account = await fetchWindow(window.start, window.end)
    const total = account.totals?.[0]
    visits += Math.max(0, Math.round(total?.sum?.visits ?? 0))
    pageViews += Math.max(0, Math.round(total?.count ?? 0))

    for (const row of account.countries ?? []) {
      const country = countryRecord(row)
      if (!country) continue
      const previous = countryTotals.get(country.code)
      countryTotals.set(country.code, {
        ...country,
        visits: country.visits + (previous?.visits ?? 0),
        pageViews: country.pageViews + (previous?.pageViews ?? 0),
      })
    }
  }

  const countries = [...countryTotals.values()]
    .filter((country) => country.visits > 0 || country.pageViews > 0)
    .sort((left, right) => right.visits - left.visits || right.pageViews - left.pageViews)

  return {
    totals: {
      visits,
      pageViews,
    },
    countries,
  }
}

function monthKey(date) {
  return date.toISOString().slice(0, 7)
}

function monthStart(month) {
  return new Date(`${month}-01T00:00:00.000Z`)
}

function nextMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

function configuredStartMonth(now) {
  const configured = process.env.TRAFFIC_START_MONTH ?? DEFAULT_START_MONTH
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(configured)) {
    throw new Error('TRAFFIC_START_MONTH must use YYYY-MM format')
  }
  if (monthStart(configured) > now) {
    throw new Error('TRAFFIC_START_MONTH cannot be in the future')
  }
  return configured
}

function monthKeys(first, last) {
  const keys = []
  let cursor = monthStart(first)
  const end = monthStart(last)

  while (cursor <= end) {
    keys.push(monthKey(cursor))
    cursor = nextMonth(cursor)
  }

  return keys
}

function storedMonths(previous) {
  if (!Array.isArray(previous?.months)) return []
  return previous.months
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month?.month ?? ''))
    .map((month) => {
      const normalized = { ...month }
      delete normalized.complete
      return normalized
    })
    .sort((left, right) => left.month.localeCompare(right.month))
}

async function fetchMonth(month, now) {
  const calendarStart = monthStart(month)
  const endOfMonth = nextMonth(calendarStart)
  const end = endOfMonth < now ? endOfMonth : now
  const snapshot = await fetchPeriod(calendarStart, end)

  return {
    month,
    ...snapshot,
  }
}

function aggregateSnapshots(snapshots) {
  const countryTotals = new Map()
  let visits = 0
  let pageViews = 0

  for (const snapshot of snapshots) {
    visits += snapshot.totals.visits
    pageViews += snapshot.totals.pageViews

    for (const country of snapshot.countries) {
      const previous = countryTotals.get(country.code)
      countryTotals.set(country.code, {
        ...country,
        visits: country.visits + (previous?.visits ?? 0),
        pageViews: country.pageViews + (previous?.pageViews ?? 0),
      })
    }
  }

  const countries = [...countryTotals.values()]
    .filter((country) => country.visits > 0 || country.pageViews > 0)
    .sort((left, right) => right.visits - left.visits || right.pageViews - left.pageViews)

  return {
    totals: { visits, pageViews },
    countries,
  }
}

async function refreshTraffic(previous) {
  const now = new Date()
  const currentMonth = monthKey(now)
  const existingMonths = storedMonths(previous)
  const firstMonth = existingMonths[0]?.month ?? configuredStartMonth(now)
  const existingByKey = new Map(existingMonths.map((month) => [month.month, month]))
  const months = []

  for (const key of monthKeys(firstMonth, currentMonth)) {
    const existing = existingByKey.get(key)
    if (key !== currentMonth && existing) {
      months.push(existing)
      continue
    }

    console.log(`Fetching Cloudflare traffic for ${key}${key === currentMonth ? ' (current)' : ''}`)
    months.push(await fetchMonth(key, now))
  }

  return {
    generatedAt: now.toISOString(),
    months,
  }
}

async function main() {
  const previous = await loadPrevious()
  if (!token || !accountId || !siteTag) {
    console.warn('Cloudflare analytics credentials are not configured; preserving traffic snapshot.')
    return
  }

  try {
    const next = await refreshTraffic(previous)
    if (metricsEqual(next, previous)) {
      console.log('✅ traffic metrics are unchanged; preserving the existing snapshot timestamp')
      return
    }

    await writeFile(OUT, `${JSON.stringify(next, null, 2)}\n`)
    console.log('✅ wrote', OUT)
    console.log(JSON.stringify(aggregateSnapshots(next.months).totals))
  } catch (error) {
    console.warn(`Cloudflare traffic fetch failed; preserving existing snapshot: ${error.message}`)
  }
}

main()
