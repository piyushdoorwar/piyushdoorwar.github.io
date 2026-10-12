import type { IconType } from 'react-icons'
import { FiTerminal } from 'react-icons/fi'
import { FaPlug } from 'react-icons/fa6'
import { SiClaude, SiCursor } from 'react-icons/si'
import { TbBrandOpenai, TbBrandVscode } from 'react-icons/tb'
import { MCP_ENDPOINT } from './endpoints'

/** Name a client gives the server; also the key in every config snippet below. */
const SERVER_KEY = 'piyush'

export interface AgentTool {
  name: string
  summary: string
  /** Arguments the page's live playground sends; omitted for tools that take none. */
  example?: Record<string, unknown>
}

/**
 * The tools as the /mcp/ page lists them. Names must match `TOOLS` in
 * mcp-server/api/mcp.ts; mcp-server/test/mcp.test.ts fails when they drift.
 */
export const agentTools: AgentTool[] = [
  { name: 'get_profile', summary: 'Who I am, where I work from, my skills and how to reach me.' },
  { name: 'get_experience', summary: 'Every role, most recent first, with dates and highlights.' },
  {
    name: 'list_projects',
    summary: 'Everything I have shipped, one line each, filterable by kind.',
    example: { filter: 'VS Code' },
  },
  {
    name: 'get_project',
    summary: 'One project in full: what it does, the stack and its links.',
    example: { id: 'gitable' },
  },
  {
    name: 'get_writing',
    summary: 'My books and Medium articles, filterable by topic.',
    example: { topic: 'kafka', limit: 3 },
  },
  {
    name: 'get_certifications',
    summary: 'Certifications with issuer, date and a link to verify.',
    example: { filter: 'Microsoft' },
  },
  { name: 'get_music', summary: 'What I release as Proto Elyon, and where to listen.' },
  { name: 'get_stats', summary: 'Stars, installs, downloads and visits, with when they were measured.' },
]

/** The client's main button: a link that installs or opens settings, or text to copy. */
export type ClientAction =
  | { kind: 'link'; label: string; href: string; external?: boolean }
  | { kind: 'copy'; label: string; text: string }

export interface ClientGuide {
  id: string
  label: string
  icon: IconType
  /** Two or three words under the name in the picker. */
  hint: string
  action: ClientAction
  steps: string[]
  /** Optional command or config to copy, shown after the steps. */
  snippet?: { label: string; code: string }
}

const configJson = (body: object) => JSON.stringify(body, null, 2)
const claudeCodeCommand = `claude mcp add --transport http ${SERVER_KEY} ${MCP_ENDPOINT}`

// One-click installs: Cursor takes base64 config, VS Code takes URL-encoded JSON.
const cursorInstall = `cursor://anysphere.cursor-deeplink/mcp/install?name=${SERVER_KEY}&config=${btoa(
  JSON.stringify({ url: MCP_ENDPOINT }),
)}`
const vscodeInstall = `vscode:mcp/install?${encodeURIComponent(
  JSON.stringify({ name: SERVER_KEY, type: 'http', url: MCP_ENDPOINT }),
)}`

export const clientGuides: ClientGuide[] = [
  {
    id: 'claude',
    label: 'Claude',
    icon: SiClaude,
    hint: 'Connector',
    action: {
      kind: 'link',
      label: 'Open Claude connectors',
      href: 'https://claude.ai/settings/connectors',
      external: true,
    },
    steps: [
      'Open connector settings and choose Add custom connector.',
      'Name it Piyush and paste the endpoint above.',
      'Start a chat and ask about my work. Claude picks the tool itself.',
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    icon: TbBrandOpenai,
    hint: 'Developer mode',
    action: {
      kind: 'link',
      label: 'Open ChatGPT settings',
      href: 'https://chatgpt.com/#settings/Connectors',
      external: true,
    },
    steps: [
      'In Apps & Connectors, turn on Developer mode under Advanced.',
      'Choose Create, name it Piyush and paste the endpoint above. Authentication: None.',
      'In a new chat, enable it from the tools menu and ask away.',
    ],
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    icon: FiTerminal,
    hint: 'One command',
    action: { kind: 'copy', label: 'Copy command', text: claudeCodeCommand },
    steps: ['Run this once in a terminal, then ask about me in any session.'],
    snippet: { label: 'terminal', code: claudeCodeCommand },
  },
  {
    id: 'cursor',
    label: 'Cursor',
    icon: SiCursor,
    hint: 'One click',
    action: { kind: 'link', label: 'Add to Cursor', href: cursorInstall },
    steps: [
      'Click Add to Cursor and confirm the install in Cursor.',
      'Or add it by hand to ~/.cursor/mcp.json:',
    ],
    snippet: {
      label: 'mcp.json',
      code: configJson({ mcpServers: { [SERVER_KEY]: { url: MCP_ENDPOINT } } }),
    },
  },
  {
    id: 'vscode',
    label: 'VS Code',
    icon: TbBrandVscode,
    hint: 'One click',
    action: { kind: 'link', label: 'Install in VS Code', href: vscodeInstall },
    steps: [
      'Click Install in VS Code and confirm, then use it from Agent mode.',
      'Or add it by hand to .vscode/mcp.json:',
    ],
    snippet: {
      label: 'mcp.json',
      code: configJson({ servers: { [SERVER_KEY]: { type: 'http', url: MCP_ENDPOINT } } }),
    },
  },
  {
    id: 'other',
    label: 'Any client',
    icon: FaPlug,
    hint: 'HTTP endpoint',
    action: { kind: 'copy', label: 'Copy endpoint', text: MCP_ENDPOINT },
    steps: [
      'Any client that speaks Streamable HTTP can connect. There is no key and no sign-up.',
      'If yours only launches local servers, bridge it with mcp-remote:',
    ],
    snippet: {
      label: 'config',
      code: configJson({
        mcpServers: { [SERVER_KEY]: { command: 'npx', args: ['-y', 'mcp-remote', MCP_ENDPOINT] } },
      }),
    },
  },
]
