/**
 * Read-only MCP server for piyushdoorwar.com (Streamable HTTP transport, stateless,
 * JSON responses only). Every tool answers from the snapshot the portfolio publishes
 * at /agent/data.json, so a site deploy is the only release this needs.
 *
 * Deployed as a Vercel function; `vercel.json` rewrites /mcp here. Kept in one file
 * with no dependencies so the function bundle is just this module.
 */

// Read through globalThis so the file type-checks without Node's types.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
const DATA_URL = env?.AGENT_DATA_URL ?? 'https://piyushdoorwar.com/agent/data.json'
const SITE_PAGE = 'https://piyushdoorwar.com/mcp/'
const CACHE_MS = 5 * 60_000

/** Newest first; an unknown client version is answered with the newest we speak. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

export const SERVER_INFO = {
  name: 'piyushdoorwar',
  title: 'Piyush Doorwar',
  version: '1.0.0',
  websiteUrl: 'https://piyushdoorwar.com/',
}

const INSTRUCTIONS =
  'Answers questions about Piyush Doorwar, a backend engineer in Mumbai: profile and skills, ' +
  'work history, software projects, books and articles, certifications, music and public stats. ' +
  'All tools are read-only and return JSON from his published portfolio. Prefer quoting links ' +
  'from the results over guessing, and use get_profile for contact details.'

// ── Snapshot shape (mirrors buildAgentData() in src/agent/agentData.ts) ──────────

interface Link {
  label: string
  url: string
}

export interface AgentData {
  version: number
  site: string
  generatedAt: string
  profile: {
    name: string
    handle: string
    headline: string
    location: string
    tagline: string
    about: string[]
    skills: { group: string; items: string[] }[]
    email: string
    links: Link[]
  }
  experience: {
    company: string
    location: string | null
    workMode: string | null
    employmentType: string | null
    positions: { role: string; start: string; end: string | null }[]
    highlights: string[]
    award: string | null
  }[]
  projects: {
    id: string
    name: string
    kind: string
    tagline: string
    description: string
    tags: string[]
    featured: boolean
    website: string
    github: string | null
    vscodeMarketplace: string | null
  }[]
  books: { title: string; subtitle: string | null; url: string; series: string | null }[]
  articles: {
    title: string
    subtitle: string
    url: string
    publishedAt: string | null
    tags: string[]
    readingTimeMin: number
    claps: number | null
  }[]
  certifications: {
    name: string
    provider: string
    issued: string
    url: string | null
    skills: string[]
  }[]
  music: { artist: string; about: string; links: Link[] }
  stats: Record<string, number | string | null>
}

// ── Tools ────────────────────────────────────────────────────────────────────────

type Args = Record<string, unknown>

interface Tool {
  name: string
  title: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
    additionalProperties: false
  }
  run(data: AgentData, args: Args): unknown
}

class ToolInputError extends Error {}

const noInput = { type: 'object', properties: {}, additionalProperties: false } as const

function text(args: Args, key: string) {
  const value = args[key]
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new ToolInputError(`"${key}" must be a string.`)
  return value.trim().toLowerCase()
}

function limit(args: Args, fallback: number) {
  const value = args.limit
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ToolInputError('"limit" must be a positive integer.')
  }
  return Math.min(value, 50)
}

function matches(query: string | undefined, ...fields: (string | null | undefined)[]) {
  return !query || fields.some((field) => field?.toLowerCase().includes(query))
}

export const TOOLS: Tool[] = [
  {
    name: 'get_profile',
    title: 'Profile',
    description:
      'Who Piyush is: headline, location, bio, grouped technical skills, email and social links.',
    inputSchema: noInput,
    run: (data) => data.profile,
  },
  {
    name: 'get_experience',
    title: 'Work history',
    description:
      'Work history, most recent first: company, roles with YYYY-MM dates (end null means current), highlights and awards.',
    inputSchema: noInput,
    run: (data) => ({ experience: data.experience }),
  },
  {
    name: 'list_projects',
    title: 'Projects',
    description:
      'Every software project he has shipped, one line each. Optionally filter by kind or tag text, e.g. "VS Code", "Desktop", ".NET".',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Case-insensitive match on kind, name or tags.' },
      },
      additionalProperties: false,
    },
    run: (data, args) => {
      const filter = text(args, 'filter')
      return {
        projects: data.projects
          .filter((p) => matches(filter, p.kind, p.name, ...p.tags))
          .map(({ id, name, kind, tagline, website }) => ({ id, name, kind, tagline, website })),
      }
    },
  },
  {
    name: 'get_project',
    title: 'Project details',
    description:
      'One project in full: description, tags, website, source repository and marketplace link. Use an id from list_projects.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Project id or name, e.g. "gitable".' } },
      required: ['id'],
      additionalProperties: false,
    },
    run: (data, args) => {
      const id = text(args, 'id')
      if (!id) throw new ToolInputError('"id" is required.')
      const project =
        data.projects.find((p) => p.id === id || p.name.toLowerCase() === id) ??
        data.projects.find((p) => p.name.toLowerCase().includes(id))
      if (!project) {
        throw new ToolInputError(
          `No project "${id}". Known ids: ${data.projects.map((p) => p.id).join(', ')}.`,
        )
      }
      return project
    },
  },
  {
    name: 'get_writing',
    title: 'Books and articles',
    description:
      'Published books and Medium articles (most popular first). Optionally filter by topic text and cap the article count.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Case-insensitive match on title, subtitle or tags.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max articles (default 10).' },
      },
      additionalProperties: false,
    },
    run: (data, args) => {
      const topic = text(args, 'topic')
      const articles = data.articles.filter((a) => matches(topic, a.title, a.subtitle, ...a.tags))
      return {
        books: data.books.filter((b) => matches(topic, b.title, b.subtitle, b.series)),
        articles: articles.slice(0, limit(args, 10)),
        totalArticles: articles.length,
      }
    },
  },
  {
    name: 'get_certifications',
    title: 'Certifications',
    description:
      'Certifications with issuer, date and verification link. Optionally filter by skill or provider, e.g. "Kafka", "Microsoft".',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Case-insensitive match on name, provider or skills.' },
      },
      additionalProperties: false,
    },
    run: (data, args) => {
      const filter = text(args, 'filter')
      return {
        certifications: data.certifications.filter((c) =>
          matches(filter, c.name, c.provider, ...c.skills),
        ),
      }
    },
  },
  {
    name: 'get_music',
    title: 'Music',
    description: 'His music as Proto Elyon, with links to every streaming platform.',
    inputSchema: noInput,
    run: (data) => data.music,
  },
  {
    name: 'get_stats',
    title: 'Public stats',
    description:
      'Public impact numbers: GitHub stars, VS Code installs, release downloads and portfolio visits, with when they were measured.',
    inputSchema: noInput,
    run: (data) => data.stats,
  },
]

// ── Data loading ─────────────────────────────────────────────────────────────────

let cache: { data: AgentData; at: number } | undefined

export async function loadData(fetcher: typeof fetch = fetch): Promise<AgentData> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  try {
    const response = await fetcher(DATA_URL, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    cache = { data: (await response.json()) as AgentData, at: Date.now() }
  } catch (error) {
    // A stale snapshot beats an outage; only fail when there has never been one.
    if (!cache) throw error
  }
  return cache.data
}

export function resetCache() {
  cache = undefined
}

// ── JSON-RPC ─────────────────────────────────────────────────────────────────────

type Id = string | number | null

interface RpcMessage {
  jsonrpc?: unknown
  id?: Id
  method?: unknown
  params?: Record<string, unknown>
}

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602
const INTERNAL_ERROR = -32603

const ok = (id: Id, result: unknown) => ({ jsonrpc: '2.0', id, result })
const fail = (id: Id, code: number, message: string) => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

function listTools() {
  return TOOLS.map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
    annotations: { title, readOnlyHint: true, openWorldHint: false },
  }))
}

/** Handles one JSON-RPC message; returns undefined for notifications, which get no reply. */
export async function handleMessage(
  message: RpcMessage,
  getData: () => Promise<AgentData> = loadData,
) {
  const isRequest = 'id' in message && message.id !== undefined
  const id = (message.id ?? null) as Id
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return isRequest ? fail(id, INVALID_REQUEST, 'Expected a JSON-RPC 2.0 request.') : undefined
  }
  if (!isRequest) return undefined

  switch (message.method) {
    case 'initialize': {
      const requested = message.params?.protocolVersion
      return ok(id, {
        protocolVersion:
          typeof requested === 'string' && PROTOCOL_VERSIONS.includes(requested)
            ? requested
            : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      })
    }
    case 'ping':
      return ok(id, {})
    case 'tools/list':
      return ok(id, { tools: listTools() })
    case 'tools/call': {
      const name = message.params?.name
      const tool = TOOLS.find((candidate) => candidate.name === name)
      if (!tool) return fail(id, INVALID_PARAMS, `Unknown tool: ${String(name)}`)
      const args = message.params?.arguments ?? {}
      if (typeof args !== 'object' || Array.isArray(args)) {
        return fail(id, INVALID_PARAMS, 'Tool arguments must be an object.')
      }
      let data: AgentData
      try {
        data = await getData()
      } catch {
        return fail(id, INTERNAL_ERROR, 'Portfolio data is unavailable right now.')
      }
      try {
        const result = tool.run(data, args as Args)
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        })
      } catch (error) {
        // Bad arguments are reported to the model as a tool error it can correct.
        if (!(error instanceof ToolInputError)) throw error
        return ok(id, { content: [{ type: 'text', text: error.message }], isError: true })
      }
    }
    default:
      return fail(id, METHOD_NOT_FOUND, `Method not found: ${message.method}`)
  }
}

// ── HTTP ─────────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

/** No server-initiated stream is offered, so GET is refused as the transport allows. */
export function GET() {
  return new Response(`This is an MCP endpoint. Setup instructions: ${SITE_PAGE}\n`, {
    status: 405,
    headers: { ...CORS, Allow: 'POST, OPTIONS', 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(fail(null, PARSE_ERROR, 'Body must be JSON.'), 400)
  }

  // Older clients may batch; answer each request and drop notifications.
  const messages = Array.isArray(body) ? body : [body]
  if (messages.length === 0 || messages.some((m) => typeof m !== 'object' || m === null)) {
    return json(fail(null, INVALID_REQUEST, 'Expected a JSON-RPC message.'), 400)
  }

  try {
    const replies = (await Promise.all(messages.map((m) => handleMessage(m as RpcMessage)))).filter(
      (reply) => reply !== undefined,
    )
    if (replies.length === 0) return new Response(null, { status: 202, headers: CORS })
    return json(Array.isArray(body) ? replies : replies[0])
  } catch {
    return json(fail(null, INTERNAL_ERROR, 'Internal error.'), 500)
  }
}
