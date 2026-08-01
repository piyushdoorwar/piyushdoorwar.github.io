import assert from 'node:assert/strict'
import test from 'node:test'
import {
  monthKey,
  monthStart,
  monthKeys,
  reconcileWindow,
  refreshTraffic,
  shiftMonth,
} from './fetch-traffic.mjs'

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

test('finalizes the previous month once and keeps older snapshots immutable', async () => {
  const fetched = []
  const fetchMonthForPeriod = async (month) => {
    fetched.push(month)
    return { month, totals: { visits: 0, pageViews: 0 }, countries: [] }
  }
  const previous = {
    months: [
      { month: '2026-06', totals: { visits: 1, pageViews: 1 }, countries: [] },
      { month: '2026-07', totals: { visits: 2, pageViews: 2 }, countries: [] },
      { month: '2026-08', totals: { visits: 3, pageViews: 3 }, countries: [] },
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
      {
        month: '2026-07',
        finalized: true,
        totals: { visits: 260, pageViews: 270 },
        countries: [],
      },
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
