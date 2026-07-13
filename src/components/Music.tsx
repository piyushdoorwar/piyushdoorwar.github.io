import { motion } from 'framer-motion'
import { FaSpotify, FaYoutube } from 'react-icons/fa6'
import { musicLinks, musicBlurb, spotifyEmbedUrl } from '../data/music'

const iconFor = (platform: string) =>
  platform === 'Spotify' ? <FaSpotify /> : <FaYoutube />

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
        <h2 className="section-title">I make music too</h2>

        <p className="max-w-2xl leading-relaxed text-slate-400">{musicBlurb}</p>

        {spotifyEmbedUrl && (
          <div className="mt-6 overflow-hidden rounded-xl border border-ink-600/70">
            <iframe
              title="Spotify player"
              src={spotifyEmbedUrl}
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {musicLinks.map((m) => (
            <a
              key={m.platform}
              href={m.href}
              target={m.href.startsWith('http') ? '_blank' : undefined}
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
