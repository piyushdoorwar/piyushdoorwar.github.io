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
//   TRAFFIC_UTC_OFFSET_MINUTES Dashboard timezone offset (defaults to GMT+5:30)

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import iso from 'iso-3166-1'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../src/data/traffic.generated.json')
const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'
const DEFAULT_START_MONTH = '2026-01'
const DEFAULT_UTC_OFFSET_MINUTES = 330
const QUERY_WINDOW_DAYS = 7
const MAX_FETCH_ATTEMPTS = 3
const RETRY_DELAY_MS = 750

// Cloudflare RUM is an adaptive, sampled dataset: the `totals` aggregate and
// the `countries` breakdown are resolved independently and can disagree by a
// sample interval or two on thin windows. Tolerate that much drift, treat the
// country breakdown as authoritative, and still fail loudly on real
// disagreement (a truncated breakdown, a wrong site tag, a bad window).
const RECONCILE_ABSOLUTE_TOLERANCE = 25
const RECONCILE_RELATIVE_TOLERANCE = 0.05

// Comfortably above the ~250 ISO-3166 country codes, so a full page of rows
// means the breakdown was truncated rather than merely complete.
const COUNTRY_LIMIT = 300

// Data problems are deterministic; retrying the same window cannot fix them.
class TrafficDataError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TrafficDataError'
    this.retryable = false
  }
}

const token = process.env.CLOUDFLARE_API_TOKEN
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const siteTag = process.env.CLOUDFLARE_SITE_TAG

function configuredUtcOffsetMinutes() {
  const configured = process.env.TRAFFIC_UTC_OFFSET_MINUTES
    ?? String(DEFAULT_UTC_OFFSET_MINUTES)
  if (!/^-?\d+$/.test(configured)) {
    throw new Error('TRAFFIC_UTC_OFFSET_MINUTES must be an integer')
  }

  const minutes = Number(configured)
  if (minutes < -840 || minutes > 840) {
    throw new Error('TRAFFIC_UTC_OFFSET_MINUTES must be between -840 and 840')
  }
  return minutes
}

const utcOffsetMinutes = configuredUtcOffsetMinutes()
const utcOffsetMs = utcOffsetMinutes * 60 * 1000

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
          limit: ${COUNTRY_LIMIT}
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
  const match = /^[A-Z]{2}$/.test(code) ? iso.whereAlpha2(code) : null
  const visits = metric(row?.sum?.visits, `country visits for "${code}"`, { required: true })
  const pageViews = metric(row?.count, `country page views for "${code}"`, { required: true })

  // Keep unrecognized/empty country dimensions in an unmapped bucket so
  // country sums still reconcile with the API totals.
  if (!match) {
    return {
      code: 'ZZ',
      numericCode: '000',
      name: 'Unknown',
      visits,
      pageViews,
    }
  }

  return {
    code,
    numericCode: match.numeric,
    name: countryName(code, match.country),
    visits,
    pageViews,
  }
}

// `required` distinguishes "the API said zero" from "the API omitted the
// field". Silently coercing an absent field to 0 is how a partial payload ends
// up looking like a real traffic collapse.
function metric(value, label, { required = false } = {}) {
  if (required && (value === null || value === undefined)) {
    throw new TrafficDataError(`Cloudflare omitted ${label}`)
  }

  const numericValue = Number(value ?? 0)
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new TrafficDataError(`Cloudflare returned an invalid ${label}`)
  }
  return Math.round(numericValue)
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function windowLabel(start, end) {
  return `${start.toISOString()}–${end.toISOString()}`
}

async function requestWindow(start, end) {
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

function reconcileTolerance(countrySum) {
  return Math.max(
    RECONCILE_ABSOLUTE_TOLERANCE,
    Math.round(countrySum * RECONCILE_RELATIVE_TOLERANCE),
  )
}

function reconcileWindow(account, start, end) {
  if (!Array.isArray(account?.totals) || !Array.isArray(account?.countries)) {
    throw new TrafficDataError(
      `Cloudflare returned a malformed analytics payload for ${windowLabel(start, end)}`,
    )
  }

  const countries = account.countries.map(countryRecord)
  if (countries.length >= COUNTRY_LIMIT) {
    throw new TrafficDataError(
      `Cloudflare truncated the country breakdown for ${windowLabel(start, end)} `
      + `(${countries.length} rows at the ${COUNTRY_LIMIT}-row limit)`,
    )
  }

  // The country breakdown is what the visitor map renders, so it is the source
  // of truth: taking totals from it means the stored totals can never disagree
  // with the sum of their own parts.
  const countryVisits = countries.reduce((sum, country) => sum + country.visits, 0)
  const countryPageViews = countries.reduce((sum, country) => sum + country.pageViews, 0)
  const totals = { visits: countryVisits, pageViews: countryPageViews }

  // An absent totals row is an incomplete answer, not a zero. With no country
  // rows either it is a genuinely empty window; otherwise there is nothing to
  // cross-check the breakdown against and we say so instead of inventing a 0.
  const total = account.totals[0]
  if (!total) {
    if (countries.length > 0) {
      console.warn(
        `Cloudflare omitted the totals row for ${windowLabel(start, end)}; `
        + `trusting the country breakdown (${countryVisits}/${countryPageViews})`,
      )
    }
    return { totals, countries }
  }

  const totalVisits = metric(total.sum?.visits, 'total visits', { required: true })
  const totalPageViews = metric(total.count, 'total page views', { required: true })
  const visitDrift = Math.abs(totalVisits - countryVisits)
  const pageViewDrift = Math.abs(totalPageViews - countryPageViews)

  if (
    visitDrift > reconcileTolerance(countryVisits)
    || pageViewDrift > reconcileTolerance(countryPageViews)
  ) {
    throw new TrafficDataError(
      `Cloudflare totals did not reconcile for ${windowLabel(start, end)} `
      + `(totals ${totalVisits}/${totalPageViews}, countries ${countryVisits}/${countryPageViews})`,
    )
  }

  if (visitDrift > 0 || pageViewDrift > 0) {
    console.warn(
      `Cloudflare sampling drift for ${windowLabel(start, end)}: `
      + `totals ${totalVisits}/${totalPageViews} vs `
      + `countries ${countryVisits}/${countryPageViews}; using the breakdown`,
    )
  }

  return { totals, countries }
}

async function fetchWindow(start, end) {
  let lastError

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return reconcileWindow(await requestWindow(start, end), start, end)
    } catch (error) {
      lastError = error
      // Only transport-level failures are worth a second look.
      if (error?.retryable === false) break
      if (attempt === MAX_FETCH_ATTEMPTS) break
      console.warn(
        `Cloudflare window fetch attempt ${attempt} failed; retrying: ${error.message}`,
      )
      await delay(RETRY_DELAY_MS * attempt)
    }
  }

  throw lastError
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
    const snapshot = await fetchWindow(window.start, window.end)
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
    totals: {
      visits,
      pageViews,
    },
    countries,
  }
}

function monthKey(date) {
  return new Date(date.getTime() + utcOffsetMs).toISOString().slice(0, 7)
}

function monthStart(month) {
  return new Date(new Date(`${month}-01T00:00:00.000Z`).getTime() - utcOffsetMs)
}

function shiftMonth(month, offset) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7)
}

function configuredStartMonth(now) {
  const configured = process.env.TRAFFIC_START_MONTH ?? DEFAULT_START_MONTH
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(configured)) {
    throw new Error('TRAFFIC_START_MONTH must use YYYY-MM format')
  }
  if (configured > monthKey(now)) {
    throw new Error('TRAFFIC_START_MONTH cannot be in the future')
  }
  return configured
}

function monthKeys(first, last) {
  const keys = []
  let cursor = first

  while (cursor <= last) {
    keys.push(cursor)
    cursor = shiftMonth(cursor, 1)
  }

  return keys
}

function storedMonths(previous) {
  if (!Array.isArray(previous?.months)) return []
  return previous.months
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month?.month ?? ''))
    .map((month) => ({ ...month }))
    .sort((left, right) => left.month.localeCompare(right.month))
}

async function fetchMonth(month, now) {
  const calendarStart = monthStart(month)
  const endOfMonth = monthStart(shiftMonth(month, 1))
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

// Within a calendar month, cumulative counts can only grow. A refetch that
// comes back lower means the window lost data upstream (sampling, retention,
// a partial response) rather than that visitors were taken away, so the stored
// high-water mark is the more accurate number and we keep it.
function regressed(next, existing) {
  if (!existing?.totals) return false
  return next.totals.visits < existing.totals.visits
    || next.totals.pageViews < existing.totals.pageViews
}

// Last line of defence before anything reaches the committed JSON: whatever
// the site reads must be internally consistent, whether it was just fetched or
// carried over from a previous run.
function assertSnapshotIntegrity(snapshot) {
  if (!Array.isArray(snapshot?.months) || snapshot.months.length === 0) {
    throw new TrafficDataError('Refusing to write a traffic snapshot with no months')
  }

  const seen = new Set()
  for (const month of snapshot.months) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month?.month ?? '')) {
      throw new TrafficDataError(`Traffic snapshot has an invalid month key: ${month?.month}`)
    }
    if (seen.has(month.month)) {
      throw new TrafficDataError(`Traffic snapshot repeats the month ${month.month}`)
    }
    seen.add(month.month)

    if (!Array.isArray(month.countries)) {
      throw new TrafficDataError(`${month.month} is missing its country breakdown`)
    }

    for (const key of ['visits', 'pageViews']) {
      const total = month.totals?.[key]
      if (!Number.isInteger(total) || total < 0) {
        throw new TrafficDataError(`${month.month} has a non-numeric ${key} total: ${total}`)
      }

      const countrySum = month.countries.reduce((sum, country) => {
        const value = country?.[key]
        if (!Number.isInteger(value) || value < 0) {
          throw new TrafficDataError(
            `${month.month} has a non-numeric ${key} for ${country?.code}: ${value}`,
          )
        }
        return sum + value
      }, 0)

      if (countrySum !== total) {
        throw new TrafficDataError(
          `${month.month} totals disagree with its country breakdown `
          + `(${key} ${total} vs ${countrySum})`,
        )
      }
    }
  }
}

async function refreshTraffic(previous, now = new Date(), fetchMonthForPeriod = fetchMonth) {
  const currentMonth = monthKey(now)
  const previousMonth = shiftMonth(currentMonth, -1)
  const existingMonths = storedMonths(previous)
  const firstMonth = existingMonths[0]?.month ?? configuredStartMonth(now)
  const existingByKey = new Map(existingMonths.map((month) => [month.month, month]))
  const months = []

  for (const key of monthKeys(firstMonth, currentMonth)) {
    const existing = existingByKey.get(key)
    const finalizedPreviousMonth = key === previousMonth && existing?.finalized === true
    const olderStoredMonth = key < previousMonth && existing
    if (finalizedPreviousMonth || olderStoredMonth) {
      months.push(existing)
      continue
    }

    const label = key === currentMonth ? 'current' : 'finalizing'
    console.log(`Fetching Cloudflare traffic for ${key} (${label})`)
    const fetched = await fetchMonthForPeriod(key, now)
    const snapshot = regressed(fetched, existing) ? existing : fetched

    if (snapshot === existing) {
      console.warn(
        `Cloudflare reported fewer events for ${key} than the stored snapshot `
        + `(${fetched.totals.visits}/${fetched.totals.pageViews} vs `
        + `${existing.totals.visits}/${existing.totals.pageViews}); keeping the stored snapshot`,
      )
    }

    months.push(key === currentMonth ? snapshot : { ...snapshot, finalized: true })
  }

  const next = {
    generatedAt: now.toISOString(),
    months,
  }
  assertSnapshotIntegrity(next)
  return next
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
    console.error(`Cloudflare traffic fetch failed; preserving existing snapshot: ${error.message}`)
    process.exitCode = 1
  }
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) await main()

export {
  assertSnapshotIntegrity,
  monthKey,
  monthStart,
  monthKeys,
  reconcileWindow,
  refreshTraffic,
  shiftMonth,
}
