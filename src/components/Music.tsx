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
        <SectionHeading
          label="music"
          title={
            <>
              I make music as <span className="text-accent">{artistName}</span>
            </>
          }
          description={musicBlurb}
          actions={musicLinks.map((m) => (
            <a
              key={m.platform}
              href={m.href}
              target="_blank"
              rel="noreferrer"
              aria-label={m.platform}
              title={m.platform}
              className="icon-btn"
            >
              {iconFor(m.platform)}
            </a>
          ))}
        />

        {/* Tabbed player */}
        <div className="panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-3 py-2.5 sm:px-4">
            <div role="tablist" aria-label="Music player" className="segmented">
              {musicEmbeds.map((e) => {
                const isActive = e.platform === active
                return (
                  <button
                    key={e.platform}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="music-player"
                    onClick={() => setActive(e.platform)}
                    className="pressable segment"
                  >
                    {/*
                      One pill shared across the tabs rather than a per-tab fill fading
                      in and out: it travels to the tab you picked, so the tabs read as
                      positions on a rail instead of independent lights.
                    */}
                    {isActive && (
                      <motion.span
                        aria-hidden="true"
                        layoutId="music-tab-indicator"
                        className="absolute inset-0 rounded border border-accent/[0.34] bg-accent/[0.07]"
                        transition={reduceMotion ? { duration: 0 } : springIndicator}
                      />
                    )}
                    <span className="relative inline-flex items-center gap-2">
                      {iconFor(e.platform)}
                      {e.platform}
                    </span>
                  </button>
                )
              })}
            </div>
            <span className="hidden items-center gap-2 text-13 text-muted sm:inline-flex">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              {artistName}
            </span>
          </div>

          <div id="music-player" role="tabpanel" className="bg-surface-2" style={{ height: 452 }}>
            {current && (
              <iframe
                key={current.platform}
                title={`${current.platform} player`}
                src={current.src}
                width="100%"
                height="100%"
                style={{ border: 0, colorScheme: 'normal' }}
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
