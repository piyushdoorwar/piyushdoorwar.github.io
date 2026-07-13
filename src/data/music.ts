export interface MusicLink {
  platform: 'Spotify' | 'YouTube Music' | 'Apple Music' | 'SoundCloud'
  label: string
  href: string
}

/**
 * Optional embed shown inline. Paste a Spotify "Embed" src URL
 * (Share → Embed → copy the iframe src, looks like
 * https://open.spotify.com/embed/artist/XXXX or /embed/track/XXXX).
 */
export const spotifyEmbedUrl: string | null = null // TODO

export const musicBlurb =
  'When I step away from the keyboard I make music. Here is where you can listen.'

// TODO: replace the placeholder hrefs with your real profile/track links.
export const musicLinks: MusicLink[] = [
  { platform: 'Spotify', label: 'Listen on Spotify', href: '#' },
  { platform: 'YouTube Music', label: 'Listen on YouTube Music', href: '#' },
]
