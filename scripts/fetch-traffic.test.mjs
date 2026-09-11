import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertSnapshotIntegrity,
  monthKey,
  monthStart,
  monthKeys,
  reconcileWindow,
  refreshTraffic,
  shiftMonth,
} from './fetch-traffic.mjs'

const START = new Date('2026-08-31T18:30:00.000Z')
const END = new Date('2026-09-07T18:30:00.000Z')

// Month fixtures have to reconcile the way real snapshots do: the totals are
// the sum of the country breakdown, never a free-floating number.
function storedMonth(month, count) {
  return {
    month,
    totals: { visits: count, pageViews: count },
    countries: [
      { code: 'IN', numericCode: '356', name: 'India', visits: count, pageViews: count },
    ],
  }
}

test('uses GMT+5:30 calendar-month boundaries by default', () => {
  assert.equal(monthStart('2026-08').toISOString(), '2026-07-31T18:30:00.000Z')
  assert.equal(monthKey(new Date('2026-07-31T18:29:59.999Z')), '2026-07')
  assert.equal(monthKey(new Date('2026-07-31T18:30:00.000Z')), '2026-08')
})

test('moves between month keys without depending on UTC boundary dates', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
  assert.deepEqual(monthKeys('2025-11', '2026-02'), [
    '2025-11',
    '2025-12',
    '2026-01',
    '2026-02',
  ])
})

test('keeps unknown countries and accepts reconciled API data', () => {
  const snapshot = reconcileWindow({
    totals: [{ count: 12, sum: { visits: 7 } }],
    countries: [
      { count: 10, sum: { visits: 6 }, dimensions: { countryName: 'IN' } },
      { count: 2, sum: { visits: 1 }, dimensions: { countryName: '' } },
    ],
  }, new Date('2026-08-01T00:00:00Z'), new Date('2026-08-02T00:00:00Z'))

  assert.deepEqual(snapshot.totals, { visits: 7, pageViews: 12 })
  assert.equal(snapshot.countries[1].code, 'ZZ')
  assert.equal(snapshot.countries[1].name, 'Unknown')
})

test('rejects API totals that do not match country aggregates', () => {
  assert.throws(() => reconcileWindow({
    totals: [{ count: 250, sum: { visits: 240 } }],
    countries: [
      { count: 300, sum: { visits: 300 }, dimensions: { countryName: 'IN' } },
      { count: 100, sum: { visits: 100 }, dimensions: { countryName: 'US' } },
    ],
  }, new Date('2026-07-01T00:00:00Z'), new Date('2026-08-01T00:00:00Z')), {
    message: /totals did not reconcile/,
  })
})

// Regression: run 34488883763 failed on exactly this payload, where the
// sampled totals aggregate came back empty while the country breakdown
// reported a single sampled pageload.
test('tolerates an empty totals row and trusts the country breakdown', () => {
  const snapshot = reconcileWindow({
    totals: [],
    countries: [
      { count: 10, sum: { visits: 0 }, dimensions: { countryName: 'IN' } },
    ],
  }, START, END)

  assert.deepEqual(snapshot.totals, { visits: 0, pageViews: 10 })
  assert.equal(snapshot.countries[0].code, 'IN')
})

test('reports an empty window as zero rather than as missing data', () => {
  const snapshot = reconcileWindow({ totals: [], countries: [] }, START, END)

  assert.deepEqual(snapshot.totals, { visits: 0, pageViews: 0 })
  assert.deepEqual(snapshot.countries, [])
})

test('absorbs sampling drift within tolerance but still reports the breakdown', () => {
  const snapshot = reconcileWindow({
    totals: [{ count: 380, sum: { visits: 290 } }],
    countries: [
      { count: 400, sum: { visits: 300 }, dimensions: { countryName: 'IN' } },
    ],
  }, START, END)

  assert.deepEqual(snapshot.totals, { visits: 300, pageViews: 400 })
})

test('rejects a payload that omits metrics instead of reading them as zero', () => {
  assert.throws(() => reconcileWindow({
    totals: [{ count: 10 }],
    countries: [{ count: 10, sum: { visits: 0 }, dimensions: { countryName: 'IN' } }],
  }, START, END), { message: /omitted total visits/ })

  assert.throws(() => reconcileWindow({
    totals: [{ count: 10, sum: { visits: 0 } }],
    countries: [{ sum: { visits: 0 }, dimensions: { countryName: 'IN' } }],
  }, START, END), { message: /omitted country page views/ })
})

test('rejects a malformed payload rather than treating it as an empty window', () => {
  assert.throws(
    () => reconcileWindow({ totals: [], countries: null }, START, END),
    { message: /malformed analytics payload/ },
  )
})

test('rejects a truncated country breakdown', () => {
  const countries = Array.from({ length: 300 }, () => ({
    count: 1,
    sum: { visits: 1 },
    dimensions: { countryName: 'IN' },
  }))

  assert.throws(
    () => reconcileWindow({ totals: [{ count: 300, sum: { visits: 300 } }], countries }, START, END),
    { message: /truncated the country breakdown/ },
  )
})

test('keeps the stored snapshot when a refetched month comes back lower', async () => {
  const previous = {
    months: [
      {
        month: '2026-09',
        totals: { visits: 1, pageViews: 11 },
        countries: [
          { code: 'IN', numericCode: '356', name: 'India', visits: 1, pageViews: 11 },
        ],
      },
    ],
  }

  const result = await refreshTraffic(
    previous,
    new Date('2026-09-10T14:25:00.000Z'),
    async (month) => ({
      month,
      totals: { visits: 0, pageViews: 10 },
      countries: [
        { code: 'IN', numericCode: '356', name: 'India', visits: 0, pageViews: 10 },
      ],
    }),
  )

  assert.deepEqual(result.months[0].totals, { visits: 1, pageViews: 11 })
})

test('stores a refetched month that grew', async () => {
  const previous = {
    months: [
      {
        month: '2026-09',
        totals: { visits: 1, pageViews: 11 },
        countries: [
          { code: 'IN', numericCode: '356', name: 'India', visits: 1, pageViews: 11 },
        ],
      },
    ],
  }

  const result = await refreshTraffic(
    previous,
    new Date('2026-09-10T14:25:00.000Z'),
    async (month) => ({
      month,
      totals: { visits: 3, pageViews: 20 },
      countries: [
        { code: 'IN', numericCode: '356', name: 'India', visits: 3, pageViews: 20 },
      ],
    }),
  )

  assert.deepEqual(result.months[0].totals, { visits: 3, pageViews: 20 })
})

test('refuses to emit a snapshot whose totals disagree with its countries', () => {
  assert.throws(() => assertSnapshotIntegrity({
    months: [
      {
        month: '2026-09',
        totals: { visits: 5, pageViews: 5 },
        countries: [
          { code: 'IN', numericCode: '356', name: 'India', visits: 4, pageViews: 5 },
        ],
      },
    ],
  }), { message: /totals disagree with its country breakdown/ })
})

test('refuses to emit a snapshot with no months or a bad month key', () => {
  assert.throws(() => assertSnapshotIntegrity({ months: [] }), { message: /no months/ })
  assert.throws(() => assertSnapshotIntegrity({
    months: [{ month: '2026-13', totals: { visits: 0, pageViews: 0 }, countries: [] }],
  }), { message: /invalid month key/ })
})

test('accepts the committed snapshot shape', async () => {
  const { readFile } = await import('node:fs/promises')
  const { fileURLToPath } = await import('node:url')
  const path = fileURLToPath(new URL('../src/data/traffic.generated.json', import.meta.url))

  assertSnapshotIntegrity(JSON.parse(await readFile(path, 'utf8')))
})

test('finalizes the previous month once and keeps older snapshots immutable', async () => {
  const fetched = []
  const fetchMonthForPeriod = async (month) => {
    fetched.push(month)
    return { month, totals: { visits: 0, pageViews: 0 }, countries: [] }
  }
  const previous = {
    months: [
      storedMonth('2026-06', 1),
      storedMonth('2026-07', 2),
      storedMonth('2026-08', 3),
    ],
  }

  const result = await refreshTraffic(
    previous,
    new Date('2026-09-01T10:17:00.000Z'),
    fetchMonthForPeriod,
  )

  assert.deepEqual(fetched, ['2026-08', '2026-09'])
  assert.equal(result.months.find((month) => month.month === '2026-06').totals.visits, 1)
  assert.equal(result.months.find((month) => month.month === '2026-07').totals.visits, 2)
  assert.equal(result.months.find((month) => month.month === '2026-08').finalized, true)
  assert.equal(result.months.find((month) => month.month === '2026-09').finalized, undefined)
})

test('does not refetch an already-finalized previous month', async () => {
  const fetched = []
  const previous = {
    months: [
      { ...storedMonth('2026-07', 260), finalized: true },
    ],
  }

  await refreshTraffic(
    previous,
    new Date('2026-08-02T10:17:00.000Z'),
    async (month) => {
      fetched.push(month)
      return { month, totals: { visits: 0, pageViews: 0 }, countries: [] }
    },
  )

  assert.deepEqual(fetched, ['2026-08'])
})
