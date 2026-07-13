export interface MusicLink {
  platform: 'Spotify' | 'YouTube Music' | 'Apple Music'
  label: string
  href: string
}

export interface MusicEmbed {
  platform: 'Spotify' | 'Apple Music'
  /** iframe src for an inline, playable player. */
  src: string
  height: number
}

/** Stage / artist name. */
export const artistName = 'Proto Elyon'

export const musicBlurb =
  'When I step away from the keyboard I make music as Proto Elyon. Hit play below, or open it on your platform of choice.'

/**
 * Playable inline players.
 * - Spotify: https://open.spotify.com/embed/artist/<id>
 * - Apple Music: https://embed.music.apple.com/<storefront>/artist/<slug>/<id>
 * (YouTube Music has no first-party channel embed, so it appears as a link below.)
 */
export const musicEmbeds: MusicEmbed[] = [
  {
    platform: 'Spotify',
    src: 'https://open.spotify.com/embed/artist/2Gqifc7jbZ0VaAaWZyQiZU?utm_source=generator&theme=0',
    height: 452,
  },
  {
    platform: 'Apple Music',
    src: 'https://embed.music.apple.com/us/artist/proto-elyon/1895799126',
    height: 450,
  },
]

export const musicLinks: MusicLink[] = [
  {
    platform: 'Spotify',
    label: 'Spotify',
    href: 'https://open.spotify.com/artist/2Gqifc7jbZ0VaAaWZyQiZU',
  },
  {
    platform: 'YouTube Music',
    label: 'YouTube Music',
    href: 'https://music.youtube.com/channel/UC0OBfty5j3A5fnBjTH3jqPQ',
  },
  {
    platform: 'Apple Music',
    label: 'Apple Music',
    href: 'https://music.apple.com/us/artist/proto-elyon/1895799126',
  },
]
