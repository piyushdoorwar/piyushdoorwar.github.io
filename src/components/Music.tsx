import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaAmazon, FaSpotify, FaYoutube, FaApple } from 'react-icons/fa6'
import { musicLinks, musicEmbeds, musicBlurb, artistName } from '../data/music'

const iconFor = (platform: string) => {
  if (platform === 'Spotify') return <FaSpotify />
  if (platform === 'Apple Music') return <FaApple />
  if (platform === 'Amazon Music') return <FaAmazon />
  return <FaYoutube />
}

export default function Music() {
  const [active, setActive] = useState(musicEmbeds[0]?.platform)
  const current = musicEmbeds.find((e) => e.platform === active) ?? musicEmbeds[0]

  return (
    <section id="music" className="section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
      >
        <p className="section-label">// music</p>
        <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-3">
          <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">
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
                className="text-slate-400 transition hover:text-accent"
              >
                {iconFor(m.platform)}
              </a>
            ))}
          </div>
        </div>

        <p className="max-w-2xl leading-relaxed text-slate-400">{musicBlurb}</p>

        {/* Tabbed player */}
        <div className="mt-8">
          <div className="flex flex-wrap gap-6 border-b border-ink-600/60">
            {musicEmbeds.map((e) => {
              const isActive = e.platform === active
              return (
                <button
                  key={e.platform}
                  onClick={() => setActive(e.platform)}
                  className={`-mb-px flex items-center gap-2 border-b-2 pb-3 font-mono text-sm transition ${
                    isActive
                      ? 'border-accent text-accent'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {iconFor(e.platform)}
                  {e.platform}
                </button>
              )
            })}
          </div>

          <div
            className="mt-5 overflow-hidden rounded-xl border border-ink-600/70 bg-ink-800/40 shadow-glow"
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
