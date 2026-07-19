import generated from './traffic.generated.json'

export interface CountryTraffic {
  code: string
  numericCode: string
  name: string
  visits: number
  pageViews: number | null
}

export interface MonthlyTraffic {
  month: string
  partial?: boolean
  coverageStart?: string
  totals: {
    visits: number
    pageViews: number | null
  }
  countries: CountryTraffic[]
}

interface GeneratedTraffic {
  generatedAt: string | null
  months: MonthlyTraffic[]
}

export interface Traffic {
  generatedAt: string | null
  periodStart: string
  periodDays: number
  totals: {
    visits: number
    pageViews: number | null
  }
  countries: CountryTraffic[]
  months: MonthlyTraffic[]
}

const snapshot = generated as GeneratedTraffic
const countryTotals = new Map<string, CountryTraffic>()
let visits = 0
let pageViews = 0

for (const period of snapshot.months) {
  visits += period.totals.visits
  pageViews += period.totals.pageViews ?? 0

  for (const country of period.countries) {
    const previous = countryTotals.get(country.code)
    countryTotals.set(country.code, {
      ...country,
      visits: country.visits + (previous?.visits ?? 0),
      pageViews: (country.pageViews ?? 0) + (previous?.pageViews ?? 0),
    })
  }
}

const countries = [...countryTotals.values()]
  .filter((country) => country.visits > 0 || (country.pageViews ?? 0) > 0)
  .sort((left, right) =>
    right.visits - left.visits || (right.pageViews ?? 0) - (left.pageViews ?? 0),
  )
const generatedAt = snapshot.generatedAt ? new Date(snapshot.generatedAt) : new Date()
const firstMonth = snapshot.months[0]
const periodStartValue = firstMonth?.coverageStart ?? `${firstMonth?.month ?? '2026-01'}-01T00:00:00.000Z`
const periodStart = new Date(periodStartValue)

export const traffic: Traffic = {
  generatedAt: snapshot.generatedAt,
  periodStart: periodStartValue,
  periodDays: Math.max(1, Math.ceil((generatedAt.getTime() - periodStart.getTime()) / 86_400_000)),
  totals: { visits, pageViews },
  countries,
  months: snapshot.months,
}
