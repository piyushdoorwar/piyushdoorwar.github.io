import { MCP_ENDPOINT } from '../agent/endpoints'

/**
 * Just enough of an MCP client for the /mcp/ page to talk to the live server. The
 * server is stateless and allows any origin, so single JSON-RPC posts are all it takes.
 */
async function rpc<T>(method: string, params: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = (await response.json()) as { result?: T; error?: { message: string } }
  if (body.error) throw new Error(body.error.message)
  return body.result as T
}

export interface ServerStatus {
  tools: number
  protocolVersion: string
}

export async function checkServer(signal?: AbortSignal): Promise<ServerStatus> {
  const [init, list] = await Promise.all([
    rpc<{ protocolVersion: string }>(
      'initialize',
      {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'piyushdoorwar.com', version: '1.0.0' },
      },
      signal,
    ),
    rpc<{ tools: unknown[] }>('tools/list', {}, signal),
  ])
  return { tools: list.tools.length, protocolVersion: init.protocolVersion }
}

export interface ToolCallResult {
  /** Pretty JSON of the structured result, or the error text the tool returned. */
  text: string
  isError: boolean
  ms: number
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ToolCallResult> {
  const started = performance.now()
  const result = await rpc<{
    content: { type: string; text?: string }[]
    structuredContent?: unknown
    isError?: boolean
  }>('tools/call', { name, arguments: args }, signal)
  return {
    text:
      result.structuredContent !== undefined
        ? JSON.stringify(result.structuredContent, null, 2)
        : result.content.map((part) => part.text ?? '').join('\n'),
    isError: result.isError ?? false,
    ms: Math.round(performance.now() - started),
  }
}
