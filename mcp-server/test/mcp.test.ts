// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAgentData } from '../../src/agent/agentData'
import { agentTools } from '../../src/agent/catalog'
import {
  GET,
  OPTIONS,
  POST,
  PROTOCOL_VERSIONS,
  TOOLS,
  handleMessage,
  loadData,
  resetCache,
  type AgentData,
} from '../api/mcp'

// The real snapshot the site publishes, so a shape change on either side fails here.
const data = JSON.parse(JSON.stringify(buildAgentData())) as AgentData
const getData = async () => data

const call = (name: string, args: Record<string, unknown> = {}) =>
  handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, getData)

function resultOf(reply: unknown) {
  return (reply as { result: { structuredContent?: any; isError?: boolean; content: { text: string }[] } })
    .result
}

function post(body: unknown) {
  return new Request('https://mcp.example/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('MCP protocol', () => {
  it('negotiates a supported protocol version, falling back to the newest', async () => {
    const known = await handleMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } },
      getData,
    )
    expect((known as any).result.protocolVersion).toBe('2025-03-26')
    expect((known as any).result.capabilities).toEqual({ tools: { listChanged: false } })

    const unknown = await handleMessage(
      { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
      getData,
    )
    expect((unknown as any).result.protocolVersion).toBe(PROTOCOL_VERSIONS[0])
  })

  it('lists every tool as read-only with an object schema', async () => {
    const reply = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, getData)
    const tools = (reply as any).result.tools
    expect(tools).toHaveLength(TOOLS.length)
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.annotations.readOnlyHint).toBe(true)
    }
  })

  it('does not answer notifications and rejects unknown methods', async () => {
    expect(
      await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, getData),
    ).toBeUndefined()
    const reply = await handleMessage({ jsonrpc: '2.0', id: 3, method: 'resources/list' }, getData)
    expect((reply as any).error.code).toBe(-32601)
  })

  it('reports an unknown tool as invalid params', async () => {
    expect(((await call('delete_everything')) as any).error.code).toBe(-32602)
  })
})

describe('tools against the published snapshot', () => {
  it('every tool runs with no arguments except get_project', async () => {
    for (const tool of TOOLS) {
      const result = resultOf(await call(tool.name))
      expect(result.isError ?? false).toBe(tool.name === 'get_project')
    }
  })

  it('filters projects and resolves one by id or name', async () => {
    const list = resultOf(await call('list_projects', { filter: 'vs code' })).structuredContent
    expect(list.projects.length).toBeGreaterThan(0)
    expect(list.projects.every((p: { kind: string }) => p.kind === 'VS Code Extension')).toBe(true)

    const byId = resultOf(await call('get_project', { id: 'gitable' })).structuredContent
    expect(byId.name).toBe('Gitable')
    const byName = resultOf(await call('get_project', { id: 'Lumyn' })).structuredContent
    expect(byName.id).toBe('lumyn')
  })

  it('returns a correctable tool error for a bad id or argument type', async () => {
    const missing = resultOf(await call('get_project', { id: 'nope' }))
    expect(missing.isError).toBe(true)
    expect(missing.content[0].text).toContain('gitable')

    expect(resultOf(await call('get_writing', { limit: 0 })).isError).toBe(true)
    expect(resultOf(await call('list_projects', { filter: 3 })).isError).toBe(true)
  })

  it('caps articles but reports the full match count', async () => {
    const writing = resultOf(await call('get_writing', { limit: 2 })).structuredContent
    expect(writing.articles).toHaveLength(Math.min(2, data.articles.length))
    expect(writing.totalArticles).toBe(data.articles.length)
  })

  it('matches the tool list shown on the /mcp/ page', () => {
    expect(agentTools.map((tool) => tool.name)).toEqual(TOOLS.map((tool) => tool.name))
  })
})

describe('HTTP transport', () => {
  it('answers a POSTed request with JSON and CORS headers', async () => {
    const response = await POST(post({ jsonrpc: '2.0', id: 7, method: 'ping' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(await response.json()).toEqual({ jsonrpc: '2.0', id: 7, result: {} })
  })

  it('accepts a notification with 202 and no body', async () => {
    const response = await POST(post({ jsonrpc: '2.0', method: 'notifications/initialized' }))
    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
  })

  it('rejects malformed bodies', async () => {
    expect((await POST(post('{not json'))).status).toBe(400)
    expect((await POST(post([]))).status).toBe(400)
  })

  it('refuses GET and answers preflight', () => {
    expect(GET().status).toBe(405)
    expect(OPTIONS().status).toBe(204)
  })
})

describe('loadData', () => {
  beforeEach(() => resetCache())

  it('caches the snapshot and serves the stale copy when a refresh fails', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(data)))
    expect((await loadData(fetcher)).profile.name).toBe(data.profile.name)
    expect(fetcher).toHaveBeenCalledTimes(1)

    await loadData(fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)

    vi.useFakeTimers({ now: Date.now() + 10 * 60_000 })
    fetcher.mockResolvedValueOnce(new Response('down', { status: 503 }))
    expect((await loadData(fetcher)).profile.name).toBe(data.profile.name)
    expect(fetcher).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('fails when there has never been a snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('down', { status: 503 }))
    await expect(loadData(fetcher)).rejects.toThrow('HTTP 503')
  })
})
