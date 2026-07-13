import { motion } from 'framer-motion'
import { FaSpotify, FaYoutube, FaApple } from 'react-icons/fa6'
import { musicLinks, musicEmbeds, musicBlurb, artistName } from '../data/music'

const iconFor = (platform: string) => {
  if (platform === 'Spotify') return <FaSpotify />
  if (platform === 'Apple Music') return <FaApple />
  return <FaYoutube />
}

export default function Music() {
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

        {/* Playable embeds */}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {musicEmbeds.map((embed) => (
            <div
              key={embed.platform}
              className="overflow-hidden rounded-xl border border-ink-600/70 bg-ink-800/40 shadow-glow"
            >
              <div className="flex items-center gap-2 border-b border-ink-600/50 px-4 py-2.5 font-mono text-xs text-slate-500">
                {iconFor(embed.platform)}
                {embed.platform}
              </div>
              <iframe
                title={`${embed.platform} player`}
                src={embed.src}
                width="100%"
                height={embed.height}
                style={{ border: 0 }}
                allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                loading="lazy"
              />
            </div>
          ))}
        </div>

      </motion.div>
    </section>
  )
}
