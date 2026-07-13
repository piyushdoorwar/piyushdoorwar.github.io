export interface MusicLink {
  platform: 'Spotify' | 'YouTube Music' | 'Apple Music'
  label: string
  href: string
}

export interface MusicEmbed {
  platform: 'Spotify' | 'Apple Music' | 'YouTube Music'
  /** iframe src for an inline, playable player. */
  src: string
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
// Shown as tabs; the first entry is the default.
export const musicEmbeds: MusicEmbed[] = [
  {
    platform: 'Spotify',
    src: 'https://open.spotify.com/embed/artist/2Gqifc7jbZ0VaAaWZyQiZU?utm_source=generator&theme=0',
  },
  {
    platform: 'Apple Music',
    src: 'https://embed.music.apple.com/us/artist/proto-elyon/1895799126',
  },
  {
    // YouTube Music has no channel embed, so we play the channel's uploads as a
    // YouTube playlist (channel UC… → uploads playlist UU…).
    // TODO: swap for a specific playlist id if you'd rather feature one.
    platform: 'YouTube Music',
    src: 'https://www.youtube.com/embed/videoseries?list=UU0OBfty5j3A5fnBjTH3jqPQ',
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
