import { projects } from '../data/projects'
import { MCP_ENDPOINT } from './agentData'

/** Name a client gives the server; also the key in every config snippet below. */
const SERVER_KEY = 'piyush'

export interface AgentTool {
  name: string
  summary: string
}

/**
 * The tools as the /mcp/ page lists them. Names must match `TOOLS` in
 * mcp-server/api/mcp.ts; mcp-server/test/mcp.test.ts fails when they drift.
 */
export const agentTools: AgentTool[] = [
  { name: 'get_profile', summary: 'Who I am, where I work from, my skills and how to reach me.' },
  { name: 'get_experience', summary: 'Every role, most recent first, with dates and highlights.' },
  { name: 'list_projects', summary: 'Everything I have shipped, one line each, filterable by kind.' },
  { name: 'get_project', summary: 'One project in full: what it does, the stack and its links.' },
  { name: 'get_writing', summary: 'My books and Medium articles, filterable by topic.' },
  { name: 'get_certifications', summary: 'Certifications with issuer, date and a link to verify.' },
  { name: 'get_music', summary: 'What I release as Proto Elyon, and where to listen.' },
  { name: 'get_stats', summary: 'Stars, installs, downloads and visits, with when they were measured.' },
]

export interface ClientGuide {
  id: string
  label: string
  steps: string[]
  /** Optional command or config to copy, shown after the steps. */
  snippet?: { label: string; code: string }
}

const configJson = (body: object) => JSON.stringify(body, null, 2)

export const clientGuides: ClientGuide[] = [
  {
    id: 'claude',
    label: 'Claude',
    steps: [
      'Open Settings, then Connectors.',
      'Choose Add custom connector.',
      `Name it Piyush and paste the endpoint above.`,
      'Start a chat and ask about my work. Claude picks the tool itself.',
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    steps: [
      'Open Settings, then Apps & Connectors, and turn on Developer mode under Advanced.',
      'Choose Create, name it Piyush and paste the endpoint above.',
      'Set authentication to None and save.',
      'In a new chat, enable it from the tools menu and ask away.',
    ],
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    steps: ['Run this once in a terminal, then ask about me in any session.'],
    snippet: {
      label: 'terminal',
      code: `claude mcp add --transport http ${SERVER_KEY} ${MCP_ENDPOINT}`,
    },
  },
  {
    id: 'cursor',
    label: 'Cursor',
    steps: ['Add this to ~/.cursor/mcp.json, or to .cursor/mcp.json in a project.'],
    snippet: {
      label: 'mcp.json',
      code: configJson({ mcpServers: { [SERVER_KEY]: { url: MCP_ENDPOINT } } }),
    },
  },
  {
    id: 'vscode',
    label: 'VS Code',
    steps: ['Add this to .vscode/mcp.json, then start it from the MCP view and use Agent mode.'],
    snippet: {
      label: 'mcp.json',
      code: configJson({ servers: { [SERVER_KEY]: { type: 'http', url: MCP_ENDPOINT } } }),
    },
  },
  {
    id: 'other',
    label: 'Any client',
    steps: [
      'Any client that speaks Streamable HTTP can connect. There is no key and no sign-up.',
      'If yours only launches local servers, bridge it with mcp-remote.',
    ],
    snippet: {
      label: 'config',
      code: configJson({
        mcpServers: { [SERVER_KEY]: { command: 'npx', args: ['-y', 'mcp-remote', MCP_ENDPOINT] } },
      }),
    },
  },
]

/** A real exchange, built from the project data so the example can never go stale. */
const extensions = projects.filter((project) => project.kind === 'VS Code Extension')

export const sampleExchange = {
  question: 'Has Piyush built any VS Code extensions?',
  calls: [`list_projects  filter: "VS Code"`, `get_project  ${extensions[0]?.id ?? 'gitable'}`],
  answer:
    `Yes, ${extensions.length}: ` +
    extensions.map((project) => `${project.name} (${project.tagline.replace(/\.$/, '')})`).join('; ') +
    '. Each is on the VS Code Marketplace, with its source on GitHub.',
}

