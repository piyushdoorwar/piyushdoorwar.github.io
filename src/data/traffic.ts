import generated from './traffic.generated.json'

export interface CountryTraffic {
  code: string
  numericCode: string
  name: string
  visits: number
  pageViews: number | null
}

export interface Traffic {
  generatedAt: string | null
  periodDays: number
  totals: {
    visits: number
    pageViews: number | null
  }
  countries: CountryTraffic[]
}

export const traffic: Traffic = generated as Traffic
