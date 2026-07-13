// Build-time Medium fetcher.
//
// Medium locked down its JSON/profile endpoints behind Cloudflare, so the only
// freely-available source is the public RSS feed (titles, dates, tags, content —
// but NO claps/comments).
//
// Claps + comments are therefore OPTIONAL enrichment via the community "Medium API"
// on RapidAPI (https://rapidapi.com/nishujain199719-vgIfuFHZxVZ/api/medium2). Set
// RAPIDAPI_MEDIUM_KEY to enable it; without the key, articles still render (sorted
// by newest) and claps/comments are simply hidden.
//
// Output: src/data/medium.generated.json (consumed by writing.ts / Writing.tsx).

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const OUT = join(root, 'src/data/medium.generated.json')

const USERNAME = 'piyushdoorwar'
const RSS_URL = `https://medium.com/feed/@${USERNAME}`
const RAPID_KEY = process.env.RAPIDAPI_MEDIUM_KEY
const RAPID_HOST = 'medium2.p.rapidapi.com'

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim()

const stripTags = (html) => decode(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))

const first = (str, re) => {
  const m = str.match(re)
  return m ? m[1] : null
}

/** Extract Medium's article id (the trailing hex) from an article URL. */
const articleId = (url) => first(url.split('?')[0], /-([0-9a-fA-F]{8,})$/)

function parseRss(xml) {
  const items = []
  const blocks = xml.split('<item>').slice(1)
  for (const raw of blocks) {
    const block = raw.split('</item>')[0]
    const title = decode(first(block, /<title>([\s\S]*?)<\/title>/) || '')
    const link = (first(block, /<link>([\s\S]*?)<\/link>/) || '').split('?')[0]
    const pubDate = first(block, /<pubDate>([\s\S]*?)<\/pubDate>/)
    const content = first(block, /<content:encoded>([\s\S]*?)<\/content:encoded>/) || ''
    const tags = [...block.matchAll(/<category>([\s\S]*?)<\/category>/g)]
      .map((m) => decode(m[1]))
      .slice(0, 4)
    const text = stripTags(content)
    const words = text ? text.split(' ').length : 0
    items.push({
      id: articleId(link),
      title,
      url: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
      tags,
      subtitle: text.slice(0, 160).trim() + (text.length > 160 ? '…' : ''),
      readingTimeMin: Math.max(1, Math.round(words / 200)),
      claps: null,
      comments: null,
    })
  }
  return items
}

async function enrichClaps(item) {
  if (!RAPID_KEY || !item.id) return
  try {
    const res = await fetch(`https://${RAPID_HOST}/article/${item.id}`, {
      headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': RAPID_HOST },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    item.claps = typeof json.claps === 'number' ? json.claps : null
    item.comments = typeof json.responses_count === 'number' ? json.responses_count : null
  } catch (err) {
    console.warn(`⚠️  claps for ${item.id}: ${err.message}`)
  }
}

/** Last-known claps/comments by article id, so a failed/skipped fetch never loses data. */
async function loadPrevious() {
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8'))
    const map = new Map()
    for (const a of prev.articles ?? []) map.set(a.id, a)
    return map
  } catch {
    return new Map()
  }
}

async function main() {
  const res = await fetch(RSS_URL, { headers: { 'User-Agent': 'portfolio-medium' } })
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`)
  const xml = await res.text()
  const items = parseRss(xml)
  const previous = await loadPrevious()

  if (RAPID_KEY) {
    console.log('Enriching claps/comments via RapidAPI…')
    for (const item of items) await enrichClaps(item)
  } else {
    console.log('RAPIDAPI_MEDIUM_KEY not set — skipping claps/comments enrichment.')
  }

  // Preserve last-known engagement when this run couldn't fetch it.
  for (const item of items) {
    const prev = previous.get(item.id)
    if (!prev) continue
    if (item.claps == null && prev.claps != null) item.claps = prev.claps
    if (item.comments == null && prev.comments != null) item.comments = prev.comments
    // Keep the hand-enriched summary instead of replacing it with the first
    // 160 characters of RSS body text on every scheduled refresh.
    if (prev.subtitle) item.subtitle = prev.subtitle
  }

  // Medium's RSS feed only exposes the latest 10 posts. Keep older articles
  // already imported from paginated API responses so a routine refresh does
  // not silently shrink the archive back to those 10 entries.
  const currentIds = new Set(items.map((item) => item.id))
  for (const previousItem of previous.values()) {
    if (!currentIds.has(previousItem.id)) items.push(previousItem)
  }

  // Best on top: sort by claps desc, then by newest.
  items.sort((a, b) => {
    const ca = a.claps ?? -1
    const cb = b.claps ?? -1
    if (cb !== ca) return cb - ca
    return (b.publishedAt || '').localeCompare(a.publishedAt || '')
  })

  const out = {
    generatedAt: new Date().toISOString(),
    hasEngagement: items.some((a) => a.claps != null),
    articles: items,
  }
  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(`✅ wrote ${items.length} articles to`, OUT)
}

main().catch((err) => {
  console.error('medium fetch failed, keeping existing medium.generated.json:', err.message)
  process.exit(0)
})
