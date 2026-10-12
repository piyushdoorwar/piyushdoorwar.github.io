import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FiArrowUpRight, FiCheck, FiCopy, FiPlay } from 'react-icons/fi'
import { agentTools, clientGuides, type ClientGuide } from '../agent/catalog'
import { MCP_ENDPOINT } from '../agent/endpoints'
import SectionHeading from '../components/SectionHeading'
import { springIndicator } from '../motion'
import { callTool, checkServer, type ServerStatus, type ToolCallResult } from './mcpClient'

const endpointUrl = new URL(MCP_ENDPOINT)
const endpointHost = endpointUrl.host
const endpointOrigin = endpointUrl.origin
const endpointPath = endpointUrl.pathname

function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the text stays selectable.
    }
  }

  return [copied, copy] as const
}

/** A labelled copy button; `iconOnly` gives the compact form used on code blocks. */
function CopyButton({
  value,
  label,
  className = 'btn btn-secondary btn-sm',
  iconOnly = false,
  compactOnPhones = false,
}: {
  value: string
  label: string
  className?: string
  iconOnly?: boolean
  /** Hide the text below `sm`, keeping it for screen readers, to give long values room. */
  compactOnPhones?: boolean
}) {
  const [copied, copy] = useCopy()
  const icon = copied ? <FiCheck size={15} /> : <FiCopy size={15} />

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => copy(value)}
        className="icon-btn icon-btn-sm"
        aria-label={copied ? 'Copied' : `Copy ${label}`}
        title={copied ? 'Copied' : 'Copy'}
      >
        {icon}
      </button>
    )
  }

  return (
    <button type="button" onClick={() => copy(value)} className={className}>
      {icon}
      <span aria-live="polite" className={compactOnPhones ? 'sr-only sm:not-sr-only' : undefined}>
        {copied ? 'Copied' : label}
      </span>
    </button>
  )
}

type Status = { state: 'checking' } | { state: 'online'; info: ServerStatus } | { state: 'down' }

function useServerStatus() {
  const [status, setStatus] = useState<Status>({ state: 'checking' })

  useEffect(() => {
    const controller = new AbortController()
    checkServer(controller.signal)
      .then((info) => setStatus({ state: 'online', info }))
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ state: 'down' })
      })
    return () => controller.abort()
  }, [])

  return status
}

function StatusLine({ status }: { status: Status }) {
  const dot =
    status.state === 'online'
      ? 'bg-accent shadow-[0_0_0_3px] shadow-accent/20'
      : status.state === 'down'
        ? 'bg-[#f87171]'
        : 'animate-pulse bg-hint'

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-13 text-muted" aria-live="polite">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {status.state === 'online' && (
        <>
          <span className="font-semibold text-heading">Online</span>
          <span aria-hidden="true">·</span>
          <span>{status.info.tools} read-only tools</span>
          <span aria-hidden="true">·</span>
          <span>no key, no sign-up</span>
        </>
      )}
      {status.state === 'checking' && <span>Checking the server…</span>}
      {status.state === 'down' && (
        <span>The server is not answering right now. Try again shortly.</span>
      )}
    </p>
  )
}

function EndpointBar() {
  const status = useServerStatus()

  return (
    <div className="panel">
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="meta-label">MCP endpoint</p>
          {/* If it must wrap on a narrow phone, it breaks before the path, not mid-word. */}
          <code className="mt-1.5 block font-mono text-xs text-heading [overflow-wrap:anywhere] min-[400px]:text-13 sm:text-lg">
            {endpointOrigin}
            <wbr />
            {endpointPath}
          </code>
        </div>
        <CopyButton
          value={MCP_ENDPOINT}
          label="Copy"
          className="btn btn-primary btn-sm shrink-0"
          compactOnPhones
        />
      </div>
      <div className="border-t border-line bg-surface-2 px-4 py-3 sm:px-5">
        <StatusLine status={status} />
      </div>
    </div>
  )
}

function ClientAction({ guide }: { guide: ClientGuide }) {
  const { action } = guide
  if (action.kind === 'copy') {
    return <CopyButton value={action.text} label={action.label} className="btn btn-primary btn-sm" />
  }
  return (
    <a
      href={action.href}
      className="btn btn-primary btn-sm"
      {...(action.external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {action.label}
      <FiArrowUpRight aria-hidden="true" size={15} />
    </a>
  )
}

function Install() {
  const [active, setActive] = useState(clientGuides[0].id)
  const reduceMotion = useReducedMotion()
  const guide = clientGuides.find((candidate) => candidate.id === active) ?? clientGuides[0]
  const Icon = guide.icon

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="MCP client"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      >
        {clientGuides.map((client) => {
          const isActive = client.id === active
          const ClientIcon = client.icon
          return (
            <button
              key={client.id}
              type="button"
              role="tab"
              id={`client-tab-${client.id}`}
              aria-selected={isActive}
              aria-controls="client-guide"
              onClick={() => setActive(client.id)}
              className={`pressable relative flex items-center gap-3 rounded-card border bg-surface p-3 text-left shadow-e1 transition-colors ${
                isActive ? 'border-transparent' : 'border-line hover:border-line-strong'
              }`}
            >
              {/* One outline travels between cards, so the picker reads as a single choice. */}
              {isActive && (
                <motion.span
                  aria-hidden="true"
                  layoutId="mcp-client-indicator"
                  className="absolute inset-0 rounded-card border border-accent/60 bg-accent/[0.07]"
                  transition={reduceMotion ? { duration: 0 } : springIndicator}
                />
              )}
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded bg-overlay/[0.06] text-heading">
                <ClientIcon aria-hidden="true" size={18} />
              </span>
              <span className="relative min-w-0">
                <span className="block truncate text-sm font-semibold text-heading">
                  {client.label}
                </span>
                <span className="block truncate text-xs text-muted">{client.hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div
        id="client-guide"
        role="tabpanel"
        aria-labelledby={`client-tab-${guide.id}`}
        className="panel"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-5 py-4">
          <span className="icon-tile">
            <Icon aria-hidden="true" size={18} />
          </span>
          <h3 className="mr-auto text-lg font-semibold">Set up in {guide.label}</h3>
          <ClientAction guide={guide} />
        </div>

        <div className="p-5 sm:p-6">
          <ol className="space-y-3">
            {guide.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-body">
                <span className="mt-0.5 font-mono text-13 font-semibold text-accent">
                  {index + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {guide.snippet && (
            <div className="mt-5 overflow-hidden rounded-card border border-line bg-surface-2">
              <div className="flex items-center justify-between border-b border-line-soft py-1.5 pl-4 pr-1.5">
                <span className="font-mono text-xs text-muted">{guide.snippet.label}</span>
                <CopyButton value={guide.snippet.code} label={guide.snippet.label} iconOnly />
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-13 leading-relaxed text-heading">
                <code>{guide.snippet.code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Pretty JSON with keys picked out, so a response scans like it would in a terminal. */
function JsonLines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, index) => {
        const match = /^(\s*)("(?:[^"\\]|\\.)*")(:\s?)(.*)$/.exec(line)
        let content: ReactNode = line
        if (match) {
          const [, indent, key, colon, value] = match
          const tone = /^(-?\d|true|false|null)/.test(value) ? 'text-cyanx' : 'text-body'
          content = (
            <>
              {indent}
              <span className="text-accent">{key}</span>
              {colon}
              <span className={tone}>{value}</span>
            </>
          )
        }
        return (
          <span key={index} className="block">
            {content}
          </span>
        )
      })}
    </>
  )
}

type Call = { tool: string; args: Record<string, unknown> }
type Run =
  | { state: 'idle' }
  | ({ state: 'running' } & Call)
  | ({ state: 'done'; result: ToolCallResult } & Call)
  | ({ state: 'failed'; message: string } & Call)

function Playground() {
  const [run, setRun] = useState<Run>({ state: 'idle' })
  const controller = useRef<AbortController | null>(null)
  const output = useRef<HTMLDivElement>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const start = async (tool: string, args: Record<string, unknown>) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setRun({ state: 'running', tool, args })
    // Stacked on phones, the output sits below the list; bring it into view.
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      output.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
    try {
      const result = await callTool(tool, args, current.signal)
      setRun({ state: 'done', tool, args, result })
    } catch (error) {
      if (current.signal.aborted) return
      setRun({ state: 'failed', tool, args, message: (error as Error).message })
    }
  }

  const activeTool = run.state === 'idle' ? null : run.tool

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ul className="grid content-start gap-2">
        {agentTools.map((tool) => {
          const isActive = tool.name === activeTool
          return (
            <li key={tool.name}>
              <button
                type="button"
                onClick={() => start(tool.name, tool.example ?? {})}
                aria-pressed={isActive}
                className={`pressable group flex w-full items-start gap-3 rounded-card border p-3.5 text-left transition-colors ${
                  isActive
                    ? 'border-accent/50 bg-accent/[0.07]'
                    : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold text-accent">
                    {tool.name}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    {tool.summary}
                  </span>
                </span>
                <FiPlay
                  aria-hidden="true"
                  size={14}
                  className="mt-1 shrink-0 text-hint transition-colors group-hover:text-accent"
                />
              </button>
            </li>
          )
        })}
      </ul>

      <div
        ref={output}
        className="portfolio-terminal panel flex scroll-mt-24 flex-col bg-surface-2 lg:sticky lg:top-24 lg:self-start"
      >
        <div className="panel-head bg-surface">
          <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <span className="mx-auto truncate font-mono text-xs text-muted">
            POST {endpointHost}/mcp
          </span>
        </div>
        <div className="h-[26rem] overflow-auto p-5 font-mono text-13 leading-relaxed sm:p-6">
          {run.state === 'idle' ? (
            <p className="text-hint">
              Pick a tool to call the live server.
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-accent/70"
              />
            </p>
          ) : (
            <>
              <p className="text-body">
                <span className="text-accent">$</span> tools/call{' '}
                <span className="text-heading">{run.tool}</span>{' '}
                {Object.keys(run.args).length > 0 && (
                  <span className="text-muted">{JSON.stringify(run.args)}</span>
                )}
              </p>
              <p className="mt-1 text-hint" aria-live="polite">
                {run.state === 'running' && 'calling…'}
                {run.state === 'done' &&
                  `${run.result.isError ? 'tool error' : 'ok'} · ${run.result.ms} ms`}
                {run.state === 'failed' && (
                  <span className="text-[#f87171]">request failed: {run.message}</span>
                )}
              </p>
              {run.state === 'done' && (
                <pre className="mt-4 whitespace-pre text-body">
                  {run.result.isError ? run.result.text : <JsonLines text={run.result.text} />}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** The /mcp/ page body; the shared shell in Root.tsx supplies the top bar and footer. */
export default function McpPage() {
  return (
    <main id="main">
      <section id="top" className="section scroll-mt-20 pb-12 sm:pb-16">
        <SectionHeading
          label="agents"
          title="This site speaks MCP."
          description="Add this portfolio to your AI as a connector and ask it about my work, projects, writing and music. It answers from the same data this site is built from."
        />
        <EndpointBar />
      </section>

      <section className="section pt-0 sm:pt-0" aria-labelledby="install-title">
        <SectionHeading
          label="install"
          title={<span id="install-title">Add it to your AI</span>}
          description="Pick your client. Every route ends at the same endpoint."
        />
        <Install />
      </section>

      <section className="section pt-0 sm:pt-0" aria-labelledby="try-title">
        <SectionHeading
          label="try it"
          title={<span id="try-title">Call it live, right here</span>}
          description="These are the tools your AI gets, and every one only reads. Pick one to call the real server from this page."
        />
        <Playground />
      </section>
    </main>
  )
}
