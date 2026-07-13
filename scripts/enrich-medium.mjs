// One-time/on-demand enrichment for the historical Medium archive.
//
// Medium article pages are Cloudflare-protected, so use Jina Reader's public
// Markdown representation to recover subtitles and enough article context to
// assign useful tags. Existing metadata is retained whenever a page cannot be
// fetched or parsed.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const OUT = join(root, 'src/data/medium.generated.json')
const ENRICH_ALL = process.argv.includes('--all')
const REQUESTED_IDS = new Set(
  process.argv.filter((arg) => arg.startsWith('--id=')).map((arg) => arg.slice('--id='.length)),
)
const CONCURRENCY = Number(process.env.MEDIUM_ENRICH_CONCURRENCY ?? 2)
const REQUEST_DELAY = Number(process.env.MEDIUM_ENRICH_DELAY_MS ?? 750)

const TAG_RULES = [
  [/\bpte\b|pearson test|read[- ]aloud|repeat sentence|describe image/i, ['pte-academic', 'english-learning', 'exam-preparation']],
  [/vs code|visual studio code/i, ['vscode', 'developer-productivity']],
  [/\buuid\b|primary keys?/i, ['uuid', 'database', 'primary-keys']],
  [/async|concurrency/i, ['async-programming', 'concurrency', 'software-performance']],
  [/\bjava\b|object-oriented|jdbc|jpa|mybatis/i, ['java', 'software-development']],
  [/\.net\b|dotnet|asp\.net|minimal api|linq|c#|visual studio (?:2019|2022)|param spread/i, ['dotnet', 'csharp', 'software-development']],
  [/\bkafka\b/i, ['apache-kafka', 'event-streaming', 'backend-development']],
  [/postgres|postgresql|snake case/i, ['postgresql', 'database']],
  [/mongodb/i, ['mongodb', 'database']],
  [/couchbase/i, ['couchbase', 'database']],
  [/elasticsearch/i, ['elasticsearch', 'database']],
  [/database|sql\b|hashing/i, ['database', 'backend-development']],
  [/microservice|monolith|vertical slice|software architecture|domain-driven|\bddd\b|clean architecture/i, ['software-architecture', 'backend-development']],
  [/cqrs|event sourcing|mediator|adapter|factory|design pattern/i, ['design-patterns', 'software-architecture']],
  [/graphql/i, ['graphql', 'api-development']],
  [/\brest\b|rest api|grpc|api rate|url shortener|pagination/i, ['api-development', 'backend-development']],
  [/terraform/i, ['terraform', 'infrastructure-as-code']],
  [/pulumi/i, ['pulumi', 'infrastructure-as-code']],
  [/azure|key vault|cloud storage/i, ['microsoft-azure', 'cloud-computing']],
  [/dependency injection|singleton|scoped|transient|keyed service/i, ['dependency-injection', 'software-development']],
  [/memory leak|performance|in-memory|database locks|scal(?:e|ing)|code review/i, ['software-performance', 'software-development']],
  [/ci\/cd|continuous integration|\bci\b|trunk-based/i, ['ci-cd', 'software-development']],
  [/jwt|json web token|authentication|secure.*app/i, ['authentication', 'web-security']],
  [/seo|useful content|google.*content/i, ['seo', 'content-strategy', 'digital-marketing']],
  [/digital identity|bankid|simple login/i, ['digital-identity', 'cybersecurity']],
  [/restart.*phone|smartphone|mobile device/i, ['smartphones', 'digital-life']],
  [/candle|\bwax\b|\bwicks?\b/i, ['diy', 'crafts', 'lifestyle']],
  [/dns|internet speed|chrome|cms|umbraco|smtp|sendgrid/i, ['web-development', 'technology']],
  [/ai coding|coding agent|vibe coding|windsurf|pair programming.*ai/i, ['ai-coding', 'software-development']],
  [/chatgpt|context window|llm|prompt engineering|generative|machine learning|deep learning|\bai\b/i, ['artificial-intelligence', 'machine-learning']],
  [/mutual fund|index fund|\bswp\b/i, ['mutual-funds', 'investing', 'personal-finance']],
  [/credit card|credit fraud/i, ['credit-cards', 'personal-finance']],
  [/stock market|algo trading|technical analysis|bullish engulfing/i, ['stock-market', 'investing']],
  [/invest|gold|fixed deposit|\bfd\b/i, ['investing', 'personal-finance']],
  [/budget|emergency fund|frugal|financial year|money plan|fire number|salary|underpaid/i, ['personal-finance', 'money-management']],
  [/medium|writing|article|read time|reads and engagement|captivat/i, ['writing', 'content-creation']],
  [/travel|cappadocia|istanbul|turkey|flight route|souvenir|work abroad|australia pr/i, ['travel', 'lifestyle']],
  [/hooters|business|merger|acquisition|spin-off/i, ['business-strategy', 'management']],
  [/time zones?/i, ['india', 'time-zones']],
  [/job market|work setting|workplace|career|interview question|system design interview/i, ['career', 'professional-development']],
  [/stress|restless|energized|decline|life paused|fork in the road/i, ['personal-development', 'wellbeing']],
  [/mutual fund|money|finance|salary|investment/i, ['personal-finance']],
  [/developer|coding|code|java|backend|api|software/i, ['software-development']],
  [/phone|internet|technology|digital identity/i, ['technology']],
  [/movie|film|candle|coffee|shilajit/i, ['lifestyle']],
]

const NOISE = [
  /^press enter or click/i,
  /^photo (by|from)/i,
  /^image (by|from)/i,
  /^ai[- ]generated image/i,
  /^get piyush doorwar/i,
  /^join medium/i,
  /^remember me/i,
  /^title:/i,
  /^url source:/i,
  /^published time:/i,
  /^markdown content:/i,
  /^\d+ min read$/i,
  /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/,
  /^✨?\s*note:/i,
  /^--+$/,
]

const TAG_BLACKLIST = new Set([
  'sitemap',
  'open-in-app',
  'sign-up',
  'sign-in',
  'write',
  'search',
  'home',
  'notifications',
  'image-generated-by-dall-e',
  'image-generated-with-dall-e',
  'ai-generated-image',
])

const RULE_TAGS = new Set(TAG_RULES.flatMap(([, tags]) => tags))

function cleanInline(value) {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^[#>*\-\s]+/, '')
    .replace(/[*_`~]/g, '')
    .replace(/\\([_#*])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNoise(value) {
  const clean = cleanInline(value)
  return !clean || NOISE.some((pattern) => pattern.test(clean)) || /Piyush Doorwar/.test(value)
}

function sameText(a, b) {
  const normalize = (value) => cleanInline(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
  return normalize(a) === normalize(b)
}

function truncate(value, max = 180) {
  if (value.length <= max) return value
  const shortened = value.slice(0, max - 1).replace(/\s+\S*$/, '')
  return `${shortened}…`
}

function cleanDescription(value) {
  return value
    .replace(/^(Mr\. Plan ₿ Publication|Sitemap Open in app Sign up Sign in)\s*/i, '')
    .replace(/^([A-Z])\s+([a-z]{3,})/, '$1$2')
    .replace(/\bAhands-on\b/g, 'A hands-on')
    .replace(/\bAlot\b/g, 'A lot')
    .replace(/\bApractical\b/g, 'A practical')
    .replace(/\bCouchbaseNetClienthas\b/g, 'CouchbaseNetClient has')
    .replace(/\bUmbracoarticle\b/g, 'Umbraco article')
    .replace(
      /someone say,?\s*[“"]?I need to update my website, but it’s such a pain to deal with the backend\??[”"]?/g,
      'someone say they need to update their website, but it’s such a pain to deal with the backend?',
    )
    .replace(/\bLiterally Say goodbye\b/g, 'Literally. Say goodbye')
    .replace(/\bIdentity How a seamless\b/g, 'Identity. How a seamless')
    .replace(/\bInsight Prepare yourself\b/g, 'Insight. Prepare yourself')
    .replace(/\s+/g, ' ')
    .trim()
}

function markdownBody(markdown) {
  const marker = 'Markdown Content:'
  const at = markdown.indexOf(marker)
  return at === -1 ? markdown : markdown.slice(at + marker.length)
}

function extractDescription(markdown, title) {
  const lines = markdownBody(markdown).split(/\r?\n/).map((line) => line.trim())
  const bylineAt = lines.findIndex((line) => /Piyush Doorwar/.test(line))
  const preamble = lines.slice(0, bylineAt === -1 ? 0 : bylineAt)
  const headings = preamble
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map(cleanInline)
    .filter((line) => line.length >= 18 && !sameText(line, title) && !isNoise(line))

  if (headings.length) {
    const combined = headings.slice(0, 2).reduce((description, heading) => {
      if (!description) return heading
      return `${description}${/[.!?:…]$/.test(description) ? ' ' : '. '}${heading}`
    }, '')
    return truncate(cleanDescription(combined))
  }

  const readTimeAt = lines.findIndex((line) => /^\d+ min read$/i.test(cleanInline(line)))
  const prose = []
  for (const line of lines.slice(readTimeAt === -1 ? 0 : readTimeAt + 1)) {
    const clean = cleanInline(line)
    if (isNoise(line) || /^#{1,6}\s+/.test(line) || clean.length < 25 || sameText(clean, title)) continue
    prose.push(clean)
    if (prose.join(' ').length >= 140) break
  }
  return truncate(cleanDescription(prose.join(' ')))
}

function toTag(value) {
  return cleanInline(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bc sharp\b/g, 'csharp')
    .replace(/\bdot net\b/g, 'dotnet')
    .replace(/[^a-z0-9+#.]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .replace(/\.+/g, '-')
}

function explicitTags(markdown) {
  const lines = markdownBody(markdown).split(/\r?\n/).map((line) => line.trim())
  const bylineAt = lines.findIndex((line) => /Piyush Doorwar/.test(line))
  if (bylineAt === -1) return []

  return lines
    .slice(0, bylineAt)
    .filter((line) => {
      const clean = cleanInline(line)
      return !isNoise(line)
        && !/^#{1,6}\s+/.test(line)
        && !/^!\[/.test(line)
        && clean.length >= 2
        && clean.length <= 30
        && clean.split(/\s+/).length <= 4
        && !/[.!?:]$/.test(clean)
    })
    .map(toTag)
    .filter((tag) => tag && !TAG_BLACKLIST.has(tag))
    .filter((tag, index, tags) => tags.indexOf(tag) === index)
    .slice(0, 4)
}

function addRuleTags(tags, text) {
  for (const [pattern, matches] of TAG_RULES) {
    if (!pattern.test(text)) continue
    for (const tag of matches) if (!tags.includes(tag)) tags.push(tag)
    if (tags.length >= 4) return
  }
}

function deriveTagsFromText(title, subtitle) {
  const tags = []
  addRuleTags(tags, title)
  if (tags.length < 2) addRuleTags(tags, subtitle)
  if (tags.length === 0) tags.push('personal-development')
  if (tags.length === 1) {
    const fallback = tags[0] === 'technology'
      ? 'digital-life'
      : tags[0] === 'lifestyle'
        ? 'personal-experiences'
        : 'lifestyle'
    if (!tags.includes(fallback)) tags.push(fallback)
  }
  return tags.slice(0, 4)
}

function deriveTags(markdown, title, subtitle) {
  const tags = explicitTags(markdown)
  const addRules = (text) => {
    addRuleTags(tags, text)
  }

  addRules(title)
  if (tags.length < 2) addRules(subtitle)
  if (tags.length === 0) tags.push('personal-development')
  return tags.slice(0, 4)
}

async function fetchMarkdown(article, attempt = 1) {
  const url = new URL(article.url)
  const readerUrl = `https://r.jina.ai/http://${url.host}${url.pathname}`
  try {
    const res = await fetch(readerUrl, {
      headers: { 'User-Agent': 'portfolio-medium-metadata' },
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`)
      error.status = res.status
      throw error
    }
    const markdown = await res.text()
    if (!markdown.includes('Markdown Content:') || markdown.length < 500) {
      throw new Error('incomplete reader response')
    }
    return markdown
  } catch (error) {
    if (attempt >= 5) throw error
    const backoff = error.status === 429 ? attempt * 15_000 : attempt * 2_000
    await new Promise((resolve) => setTimeout(resolve, backoff))
    return fetchMarkdown(article, attempt + 1)
  }
}

async function main() {
  const data = JSON.parse(await readFile(OUT, 'utf8'))
  const targets = data.articles.filter((article) => {
    if (REQUESTED_IDS.size) return REQUESTED_IDS.has(article.id)
    return ENRICH_ALL || !article.subtitle?.trim() || !article.tags?.length
  })
  let cursor = 0
  let enriched = 0
  let failed = 0

  async function worker() {
    while (cursor < targets.length) {
      const index = cursor
      cursor += 1
      const article = targets[index]
      try {
        const markdown = await fetchMarkdown(article)
        const subtitle = extractDescription(markdown, article.title)
        const tags = deriveTags(markdown, article.title, subtitle)
        if (subtitle) article.subtitle = subtitle
        if (tags.length) article.tags = tags
        enriched += 1
        console.log(`[${index + 1}/${targets.length}] ${article.title}`)
      } catch (error) {
        failed += 1
        console.warn(`⚠️  ${article.id}: ${error.message}`)
      }
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY))
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()))

  // Clean earlier enrichment runs as the parser evolves. Original/specific
  // Medium tags are retained; generic rule-only sets are regenerated from the
  // article title and the newly cleaned description.
  for (const article of data.articles) {
    article.subtitle = truncate(cleanDescription(article.subtitle ?? ''))
    const originalTags = article.tags ?? []
    const cleanedTags = originalTags.filter((tag) => !TAG_BLACKLIST.has(tag))
    const containedNoise = cleanedTags.length !== originalTags.length
    const genericOnly = cleanedTags.length > 0 && cleanedTags.every((tag) => RULE_TAGS.has(tag))
    if (genericOnly || cleanedTags.length === 0) {
      article.tags = deriveTagsFromText(article.title, article.subtitle)
    } else if (containedNoise && cleanedTags.length < 2) {
      article.tags = [...new Set([
        ...cleanedTags,
        ...deriveTagsFromText(article.title, article.subtitle),
      ])].slice(0, 4)
    } else {
      article.tags = cleanedTags.slice(0, 4)
    }
  }

  data.generatedAt = new Date().toISOString()
  await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`✅ enriched ${enriched} articles (${failed} failed)`)
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error('Medium metadata enrichment failed:', error.message)
  process.exit(1)
})
