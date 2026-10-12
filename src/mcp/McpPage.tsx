import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FiArrowLeft, FiCheck, FiCopy } from 'react-icons/fi'
import { MCP_ENDPOINT } from '../agent/agentData'
import { agentTools, clientGuides, sampleExchange } from '../agent/catalog'
import Footer from '../components/Footer'
import InteractiveGrid from '../components/InteractiveGrid'
import SectionHeading from '../components/SectionHeading'
import { profile } from '../data/profile'
import { springIndicator } from '../motion'

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the text stays selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="icon-btn icon-btn-sm"
      aria-label={copied ? 'Copied' : `Copy ${label}`}
      title={copied ? 'Copied' : 'Copy'}
    >
      {copied ? <FiCheck size={15} className="text-accent" /> : <FiCopy size={15} />}
    </button>
  )
}

function Header() {
  return (
    <header className="topbar sticky top-0 z-50 border-b border-line">
      <nav aria-label="Main" className="wrap flex h-16 items-center gap-6">
        <a
          href="/"
          className="pressable inline-flex items-center gap-2.5 font-mono text-[15px] font-semibold text-heading"
        >
          <img src="/favicon.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span>
            <span className="text-accent">~/</span>
            {profile.handle}
          </span>
        </a>
        <a href="/" className="nav-link ml-auto">
          <FiArrowLeft aria-hidden="true" size={16} />
          Portfolio
        </a>
      </nav>
    </header>
  )
}

function Install() {
  const [active, setActive] = useState(clientGuides[0].id)
  const reduceMotion = useReducedMotion()
  const guide = clientGuides.find((candidate) => candidate.id === active) ?? clientGuides[0]

  return (
    <div className="panel bg-surface-2">
      <div className="border-b border-line bg-surface p-3">
        <div role="tablist" aria-label="MCP client" className="segmented">
          {clientGuides.map((client) => {
            const isActive = client.id === active
            return (
              <button
                key={client.id}
                type="button"
                role="tab"
                id={`client-tab-${client.id}`}
                aria-selected={isActive}
                aria-controls="client-guide"
                onClick={(event) => {
                  setActive(client.id)
                  // On phones the rail scrolls; keep the picked tab fully in view.
                  event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                }}
                className="pressable segment"
              >
                {isActive && (
                  <motion.span
                    aria-hidden="true"
                    layoutId="mcp-client-indicator"
                    className="absolute inset-0 rounded border border-accent/34 bg-accent/[0.07]"
                    transition={reduceMotion ? { duration: 0 } : springIndicator}
                  />
                )}
                <span className="relative">{client.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        id="client-guide"
        role="tabpanel"
        aria-labelledby={`client-tab-${guide.id}`}
        className="p-5 sm:p-7"
      >
        <ol className="space-y-3">
          {guide.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-body">
              <span className="mt-0.5 font-mono text-13 font-semibold text-accent">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {guide.snippet && (
          <div className="mt-5 overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line-soft py-1.5 pl-4 pr-1.5">
              <span className="font-mono text-xs text-muted">{guide.snippet.label}</span>
              <CopyButton value={guide.snippet.code} label={guide.snippet.label} />
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-13 leading-relaxed text-heading">
              <code>{guide.snippet.code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function Exchange() {
  return (
    <div className="portfolio-terminal panel bg-surface-2">
      <div className="panel-head bg-surface">
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
        </div>
        <span className="mx-auto font-mono text-xs text-muted">an exchange, once connected</span>
      </div>
      <dl className="space-y-5 p-5 font-mono text-sm leading-relaxed sm:p-7">
        <div>
          <dt className="text-hint">you</dt>
          <dd className="mt-1 text-heading">{sampleExchange.question}</dd>
        </div>
        <div>
          <dt className="text-hint">calls</dt>
          {sampleExchange.calls.map((call) => (
            <dd key={call} className="mt-1 text-accent">
              → {call}
            </dd>
          ))}
        </div>
        <div>
          <dt className="text-hint">answer</dt>
          <dd className="mt-1 font-sans text-[15px] text-body">{sampleExchange.answer}</dd>
        </div>
      </dl>
    </div>
  )
}

export default function McpPage() {
  return (
    <div id="top" className="min-h-screen overflow-x-clip">
      <InteractiveGrid />
      <div className="relative z-10">
        <Header />
        <main id="main">
          <section className="section">
            <SectionHeading
              label="agents"
              title="This site speaks MCP."
              description={
                <>
                  Add this portfolio to your AI as a connector and it can answer questions about my
                  work, projects, writing and music. No account, no key: it reads the same data
                  this site is built from, so the pages and the answers always agree.
                </>
              }
            />

            <div className="card flex items-center justify-between gap-3 p-4 sm:p-6">
              <div className="min-w-0">
                <p className="meta-label">MCP endpoint</p>
                <code className="mt-1.5 block font-mono text-13 text-heading [overflow-wrap:anywhere] sm:text-base">
                  {MCP_ENDPOINT}
                </code>
              </div>
              <CopyButton value={MCP_ENDPOINT} label="MCP endpoint" />
            </div>
          </section>

          <section className="section pt-0 sm:pt-0" aria-labelledby="install-title">
            <SectionHeading
              label="install"
              title={<span id="install-title">Pick your client</span>}
              description="Every route ends at the same endpoint."
            />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <Install />
              <Exchange />
            </div>
          </section>

          <section className="section pt-0 sm:pt-0" aria-labelledby="tools-title">
            <SectionHeading
              label="tools"
              title={<span id="tools-title">The {agentTools.length} tools</span>}
              description="Every tool only reads. Nothing here sends messages or changes anything."
            />
            <dl className="grid gap-3 sm:grid-cols-2">
              {agentTools.map((tool) => (
                <div key={tool.name} className="card p-5">
                  <dt className="font-mono text-sm font-semibold text-accent">{tool.name}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-muted">{tool.summary}</dd>
                </div>
              ))}
            </dl>
          </section>

        </main>
        <Footer />
      </div>
    </div>
  )
}
