import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FaAmazon, FaSpotify, FaYoutube, FaApple } from 'react-icons/fa6'
import { musicLinks, musicEmbeds, musicBlurb, artistName } from '../data/music'
import { springIndicator, springSettle } from '../motion'
import SectionHeading from './SectionHeading'

const iconFor = (platform: string) => {
  if (platform === 'Spotify') return <FaSpotify />
  if (platform === 'Apple Music') return <FaApple />
  if (platform === 'Amazon Music') return <FaAmazon />
  return <FaYoutube />
}

export default function Music() {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(musicEmbeds[0]?.platform)
  const current = musicEmbeds.find((e) => e.platform === active) ?? musicEmbeds[0]

  return (
    <section id="music" className="section">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={reduceMotion ? { duration: 0 } : springSettle}
      >
        <SectionHeading label="music" />
        <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-3">
          <h2 className="text-3xl font-bold leading-[1.1] tracking-display text-slate-100 sm:text-4xl">
            I make music as <span className="text-accent">{artistName}</span>
          </h2>
          <div className="flex items-center gap-3 text-xl">
            {musicLinks.map((m) => (
              <a
                key={m.platform}
                href={m.href}
                target="_blank"
                rel="noreferrer"
                aria-label={m.platform}
                title={m.platform}
                className="pressable text-slate-400 transition hover:text-accent"
              >
                {iconFor(m.platform)}
              </a>
            ))}
          </div>
        </div>

        <p className="max-w-[55ch] leading-relaxed text-slate-400">{musicBlurb}</p>

        {/* Tabbed player */}
        <div className="mt-8">
          <div className="flex flex-wrap gap-6 border-b border-ink-600/60">
            {musicEmbeds.map((e) => {
              const isActive = e.platform === active
              return (
                <button
                  key={e.platform}
                  onClick={() => setActive(e.platform)}
                  className={`pressable relative -mb-px flex items-center gap-2 pb-3 font-mono text-sm transition-colors ${
                    isActive ? 'text-accent' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {iconFor(e.platform)}
                  {e.platform}
                  {/*
                    One bar shared across the tabs rather than a per-tab border fading
                    in and out: the underline travels to the tab you picked, so the
                    tabs read as positions on a rail instead of independent lights.
                  */}
                  {isActive && (
                    <motion.span
                      aria-hidden="true"
                      layoutId="music-tab-indicator"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                      transition={reduceMotion ? { duration: 0 } : springIndicator}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div
            className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-ink-800/40 shadow-e2"
            style={{ height: 452 }}
          >
            {current && (
              <iframe
                key={current.platform}
                title={`${current.platform} player`}
                src={current.src}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                allowFullScreen
                loading="lazy"
              />
            )}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
