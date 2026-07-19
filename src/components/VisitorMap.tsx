import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import world from 'world-atlas/countries-110m.json'
import { traffic, type CountryTraffic } from '../data/traffic'

const MAP_WIDTH = 1000
const MAP_HEIGHT = 470

type WorldTopology = Topology<{ countries: GeometryCollection<GeoJsonProperties> }>
type MapFeature = Feature<Geometry, GeoJsonProperties>
type Tooltip = {
  country: CountryTraffic
  x: number
  y: number
}

const topology = world as unknown as WorldTopology
const countries = feature(
  topology,
  topology.objects.countries,
) as unknown as FeatureCollection<Geometry, GeoJsonProperties>
const visibleCountries: FeatureCollection<Geometry, GeoJsonProperties> = {
  ...countries,
  features: countries.features.filter((featureItem) => numericId(featureItem) !== '010'),
}
const projection = geoNaturalEarth1().fitExtent(
  [
    [8, 8],
    [MAP_WIDTH - 8, MAP_HEIGHT - 8],
  ],
  visibleCountries,
)
const makePath = geoPath(projection)
const countryByNumericCode = new Map(
  traffic.countries.map((country) => [country.numericCode, country]),
)
const maxVisits = Math.max(...traffic.countries.map((country) => country.visits), 1)

function numericId(featureItem: MapFeature): string {
  return String(featureItem.id ?? '').padStart(3, '0')
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

function periodLabel(): string {
  if (traffic.periodStart) {
    const start = new Date(traffic.periodStart)
    return `since ${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  }
  if (traffic.periodDays >= 180 && traffic.periodDays % 30 === 0) {
    return `last ${traffic.periodDays / 30} months`
  }
  return `last ${traffic.periodDays} days`
}

function periodDescription(): string {
  const label = periodLabel()
  return traffic.periodStart ? label : `during the ${label}`
}

function tooltipPosition(event: ReactPointerEvent<SVGPathElement>) {
  const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
  if (!bounds) return { x: 20, y: 20 }

  return {
    x: Math.min(bounds.width - 150, Math.max(12, event.clientX - bounds.left + 14)),
    y: Math.max(12, event.clientY - bounds.top - 58),
  }
}

export default function VisitorMap() {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const showTooltip = (
    country: CountryTraffic,
    event: ReactPointerEvent<SVGPathElement>,
  ) => {
    setTooltip({ country, ...tooltipPosition(event) })
  }

  return (
    <div id="visitors" className="mt-16 scroll-mt-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">// visitors</p>
          <h3 className="text-2xl font-bold text-slate-100 sm:text-3xl">
            Where the site has travelled
          </h3>
        </div>

        <div className="font-mono text-xs text-slate-500 sm:pb-1">
          <strong className="text-lg font-semibold text-accent">
            {formatNumber(traffic.totals.visits)}
          </strong>{' '}
          total visits
        </div>
      </div>

      <div className="relative mt-7 overflow-hidden rounded-xl bg-transparent">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Portfolio visits by country"
          aria-describedby="visitor-map-description"
          onPointerLeave={() => setTooltip(null)}
        >
          <desc id="visitor-map-description">
            Countries with visits {periodDescription()} are highlighted.
          </desc>
          <defs>
            <pattern id="world-dots" width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.45" fill="#475569" fillOpacity="0.5" />
            </pattern>
            <filter id="country-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {visibleCountries.features.map((featureItem) => {
            const country = countryByNumericCode.get(numericId(featureItem))
            const active = country?.code === tooltip?.country.code
            const intensity = country ? 0.3 + (country.visits / maxVisits) * 0.64 : 0
            const path = makePath(featureItem)
            if (!path) return null

            return (
              <path
                key={String(featureItem.id)}
                d={path}
                fill={country ? `rgba(61, 220, 132, ${intensity})` : 'url(#world-dots)'}
                stroke="none"
                filter={active ? 'url(#country-glow)' : undefined}
                className={country ? 'cursor-pointer outline-none transition-all duration-200' : ''}
                tabIndex={country ? 0 : -1}
                role={country ? 'button' : undefined}
                aria-label={
                  country ? `${country.name}: ${formatNumber(country.visits)} visits` : undefined
                }
                onPointerEnter={(event) => country && showTooltip(country, event)}
                onPointerLeave={() => country && setTooltip(null)}
                onFocus={() => country && setTooltip({ country, x: 20, y: 20 })}
                onBlur={() => setTooltip(null)}
              />
            )
          })}
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 min-w-32 rounded-md bg-ink-800/95 px-3 py-2 shadow-glow backdrop-blur-sm"
            style={{ left: tooltip.x, top: tooltip.y }}
            role="status"
          >
            <p className="text-xs font-medium text-slate-100">{tooltip.country.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-accent">
              {formatNumber(tooltip.country.visits)} visits
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 bg-ink-950/70 px-2.5 py-1.5 font-mono text-[10px] text-slate-500 backdrop-blur-sm sm:bottom-4 sm:left-4 sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {periodLabel()}
        </div>
      </div>
    </div>
  )
}
