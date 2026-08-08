import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import world from 'world-atlas/countries-110m.json'
import { traffic, type CountryTraffic } from '../data/traffic'

const MAP_WIDTH = 1000
const MAP_HEIGHT = 470

/**
 * The haze radiates from the middle of the map and thins to nothing before the layer
 * ends, so there is no boundary anywhere to notice — the map's outer reaches simply
 * feel less glassy than its centre.
 *
 * The `50% 50%` radius is what makes that true: the ellipse hits zero alpha exactly at
 * the element's edge midpoints and the corners fall outside it entirely, so every point
 * along the layer's box is already fully transparent. A larger radius (the previous
 * `105% 108%`) leaves alpha high where the box stops, which is what read as a border.
 * The intermediate stops approximate a gaussian falloff; a plain two-stop ramp bands.
 */
const GLASS_EPICENTRE_FADE =
  'radial-gradient(50% 50% at 50% 50%, #000 0%, rgba(0,0,0,0.97) 45%, ' +
  'rgba(0,0,0,0.8) 65%, rgba(0,0,0,0.45) 82%, rgba(0,0,0,0.15) 93%, transparent 100%)'

type WorldTopology = Topology<{ countries: GeometryCollection<GeoJsonProperties> }>
type MapFeature = Feature<Geometry, GeoJsonProperties>
type Tooltip = {
  country: CountryTraffic
  x: number
  y: number
}

// The lightweight 110m atlas omits some compact countries entirely. Add their
// real higher-resolution geometry without shipping the much larger atlas.
const compactCountryFeatures: MapFeature[] = [
  {
    type: 'Feature',
    id: '702',
    properties: { name: 'Singapore' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [103.97084, 1.332142],
        [103.819638, 1.266174],
        [103.650437, 1.325198],
        [103.704437, 1.42415],
        [103.819638, 1.446718],
        [103.909639, 1.41547],
        [103.96004, 1.392902],
        [103.99604, 1.365126],
        [103.97084, 1.332142],
      ]],
    },
  },
]

const topology = world as unknown as WorldTopology
const countries = feature(
  topology,
  topology.objects.countries,
) as unknown as FeatureCollection<Geometry, GeoJsonProperties>
const visibleCountries: FeatureCollection<Geometry, GeoJsonProperties> = {
  ...countries,
  features: [
    ...countries.features.filter((featureItem) => numericId(featureItem) !== '010'),
    ...compactCountryFeatures,
  ],
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

function tooltipPosition(event: ReactPointerEvent<SVGElement>) {
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
    event: ReactPointerEvent<SVGElement>,
  ) => {
    setTooltip({ country, ...tooltipPosition(event) })
  }

  return (
    <div id="visitors" className="mt-16 scroll-mt-20">
      {/* Lifted above the haze, which now bleeds upward past the map into this row. */}
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
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

      <div className="relative mt-7">
        {/*
          A haze rather than a panel. It bleeds well past the map so the falloff happens
          out in open space rather than across the artwork, and sits behind the map so
          only the backdrop is blurred, never the coastlines.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-32 -inset-y-24 bg-ink-900/40 backdrop-blur-[6px]"
          style={{ maskImage: GLASS_EPICENTRE_FADE, WebkitMaskImage: GLASS_EPICENTRE_FADE }}
        />

        {/* Wraps the map exactly, so tooltip coordinates stay in the SVG's own space. */}
        <div className="relative">
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
                  stroke={
                    country && compactCountryFeatures.includes(featureItem)
                      ? `rgba(61, 220, 132, ${intensity})`
                      : 'none'
                  }
                  strokeWidth={compactCountryFeatures.includes(featureItem) ? 0.8 : undefined}
                  strokeLinejoin="round"
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

            {compactCountryFeatures.map((featureItem) => {
              const country = countryByNumericCode.get(numericId(featureItem))
              const [x, y] = makePath.centroid(featureItem)
              if (!country || !Number.isFinite(x) || !Number.isFinite(y)) return null

              return (
                <circle
                  key={`hit-area-${country.code}`}
                  cx={x}
                  cy={y}
                  r={8}
                  fill="transparent"
                  className="cursor-pointer"
                  aria-hidden="true"
                  onPointerEnter={(event) => showTooltip(country, event)}
                  onPointerLeave={() => setTooltip(null)}
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
        </div>
      </div>
    </div>
  )
}
