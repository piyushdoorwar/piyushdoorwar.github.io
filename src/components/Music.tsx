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
        <h2 className="section-title">
          I make music as <span className="text-accent">{artistName}</span>
        </h2>

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

        {/* Platform links */}
        <div className="mt-6 flex flex-wrap gap-3">
          {musicLinks.map((m) => (
            <a
              key={m.platform}
              href={m.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-ink-600 px-4 py-2.5 font-mono text-sm text-slate-300 transition hover:border-accent/50 hover:text-accent"
            >
              {iconFor(m.platform)}
              {m.label}
            </a>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
