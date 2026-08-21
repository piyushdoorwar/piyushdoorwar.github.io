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
const ENGAGEMENT_BATCH_SIZE = 10

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
      engagementUpdatedAt: null,
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
    if (res.status === 429) {
      console.warn(`⚠️  rate limited for ${item.id}; keeping previous engagement.`)
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const hasClaps = typeof json.claps === 'number'
    const hasComments = typeof json.responses_count === 'number'
    if (!hasClaps && !hasComments) throw new Error('response contained no engagement data')
    if (hasClaps) item.claps = json.claps
    if (hasComments) item.comments = json.responses_count
    item.engagementUpdatedAt = new Date().toISOString()
  } catch (err) {
    console.warn(`⚠️  claps for ${item.id}: ${err.message}`)
  }
}

async function enrichEngagement(items) {
  if (!RAPID_KEY) {
    console.log('RAPIDAPI_MEDIUM_KEY not set — skipping claps/comments enrichment.')
    return
  }

  const queue = [...items].sort((a, b) => {
    const aUpdated = Date.parse(a.engagementUpdatedAt ?? '') || 0
    const bUpdated = Date.parse(b.engagementUpdatedAt ?? '') || 0
    if (aUpdated !== bUpdated) return aUpdated - bUpdated
    return (a.publishedAt || '').localeCompare(b.publishedAt || '')
  })

  console.log(`Enriching claps/comments for ${queue.length} articles via RapidAPI (stalest first)…`)
  for (let offset = 0; offset < queue.length; offset += ENGAGEMENT_BATCH_SIZE) {
    const batch = queue.slice(offset, offset + ENGAGEMENT_BATCH_SIZE)
    await Promise.all(batch.map((item) => enrichClaps(item)))
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

  // Start RSS articles with their last-known engagement before refreshing it.
  for (const item of items) {
    const prev = previous.get(item.id)
    if (!prev) continue
    if (item.claps == null && prev.claps != null) item.claps = prev.claps
    if (item.comments == null && prev.comments != null) item.comments = prev.comments
    item.engagementUpdatedAt = prev.engagementUpdatedAt ?? null
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

  // Older generated files predate per-article refresh tracking.
  for (const item of items) item.engagementUpdatedAt ??= null

  // Refresh the full archive, not only the latest 10 articles exposed by RSS.
  // Rate-limited or failed articles retain the values loaded from the prior file.
  await enrichEngagement(items)

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
