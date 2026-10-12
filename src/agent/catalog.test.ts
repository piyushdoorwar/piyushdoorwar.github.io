import { describe, expect, it } from 'vitest'
import { clientGuides } from './catalog'
import { MCP_ENDPOINT } from './endpoints'

const guide = (id: string) => clientGuides.find((candidate) => candidate.id === id)!

function linkOf(id: string) {
  const { action } = guide(id)
  if (action.kind !== 'link') throw new Error(`${id} has no link action`)
  return action.href
}

describe('one-click installs', () => {
  it('hands Cursor the endpoint as base64 JSON config', () => {
    const url = new URL(linkOf('cursor'))
    expect(url.protocol).toBe('cursor:')
    expect(url.searchParams.get('name')).toBe('piyush')
    expect(JSON.parse(atob(url.searchParams.get('config')!))).toEqual({ url: MCP_ENDPOINT })
  })

  it('hands VS Code a URL-encoded HTTP server definition', () => {
    const href = linkOf('vscode')
    expect(href.startsWith('vscode:mcp/install?')).toBe(true)
    expect(JSON.parse(decodeURIComponent(href.split('?')[1]!))).toEqual({
      name: 'piyush',
      type: 'http',
      url: MCP_ENDPOINT,
    })
  })
})

describe('client guides', () => {
  it('give every client steps and a main action, and only valid JSON snippets', () => {
    for (const client of clientGuides) {
      expect(client.steps.length, client.id).toBeGreaterThan(0)
      expect(client.action.label, client.id).not.toBe('')
      const code = client.snippet?.code
      if (code?.startsWith('{')) expect(() => JSON.parse(code), client.id).not.toThrow()
    }
  })

  it('point every copy-and-paste route at the live endpoint', () => {
    for (const client of clientGuides) {
      const text = [
        client.action.kind === 'copy' ? client.action.text : '',
        client.snippet?.code ?? '',
      ].join('\n')
      if (client.action.kind === 'link' && client.action.external) continue
      expect(text, client.id).toContain(MCP_ENDPOINT)
    }
  })
})

