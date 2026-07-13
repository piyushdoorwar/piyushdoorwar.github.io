export type ProjectKind =
  | 'Desktop App'
  | 'VS Code Extension'
  | 'Chrome Extension'
  | 'GNOME Extension'
  | 'Toolkit'
  | 'Library'

export interface StatSource {
  /** GitHub "owner/repo" — used for stars, forks and release download counts. */
  githubRepo?: string
  /** VS Code Marketplace id "publisher.extension" — used for install count. */
  vscodeExtension?: string
  /** npm package name — used for monthly downloads. */
  npmPackage?: string
}

export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  /** Stable key that also maps this project to its entry in stats.generated.json. */
  id: string
  name: string
  kind: ProjectKind
  tagline: string
  description: string
  tags: string[]
  featured?: boolean
  links: ProjectLink[]
  stats?: StatSource
}

export const projects: Project[] = [
  {
    id: 'lumyn',
    name: 'Lumyn Media Player',
    kind: 'Desktop App',
    tagline: 'A clean, cross-platform desktop media player.',
    description:
      'A modern media player focused on a distraction-free playback experience across platforms.',
    tags: ['Desktop', 'Cross-platform', 'Media'],
    featured: true,
    links: [
      { label: 'GitHub', href: 'https://github.com/piyushdoorwar/lumyn-media-player' },
    ],
    stats: { githubRepo: 'piyushdoorwar/lumyn-media-player' },
  },
  {
    id: 'gitable',
    name: 'Gitable',
    kind: 'VS Code Extension',
    tagline: 'Smoother Git workflows, right inside VS Code.',
    description:
      'A VS Code extension that streamlines everyday Git actions so you stay in your editor and in flow.',
    tags: ['VS Code', 'Git', 'DX'],
    featured: true,
    links: [
      {
        label: 'Marketplace',
        href: 'https://marketplace.visualstudio.com/items?itemName=piyushdoorwar.gitable',
      },
      { label: 'GitHub', href: 'https://github.com/piyushdoorwar/gitable' },
    ],
    stats: {
      vscodeExtension: 'piyushdoorwar.gitable',
      githubRepo: 'piyushdoorwar/gitable',
    },
  },
  {
    id: 'askbetter',
    name: 'AskBetter',
    kind: 'Chrome Extension',
    tagline: 'Optimize your AI prompts on the fly.',
    description:
      'A Chrome extension that helps you write sharper prompts and get better answers from AI tools.',
    tags: ['Chrome', 'AI', 'Productivity'],
    links: [
      { label: 'GitHub', href: 'https://github.com/piyushdoorwar/ask-better' },
    ],
    stats: { githubRepo: 'piyushdoorwar/ask-better' },
  },
  {
    id: 'transmux',
    name: 'Transmux',
    kind: 'Desktop App',
    tagline: 'Fast audio & video conversion on the desktop.',
    description:
      'A desktop audio/video converter built with .NET and Avalonia for a native cross-platform feel.',
    tags: ['.NET', 'Avalonia', 'Media'],
    links: [
      { label: 'GitHub', href: 'https://github.com/piyushdoorwar/transmux' },
    ],
    stats: { githubRepo: 'piyushdoorwar/transmux' },
  },
  {
    id: 'fluxbar',
    name: 'FluxBar',
    kind: 'GNOME Extension',
    tagline: 'Live network speed, right in your GNOME top bar.',
    description:
      'A lightweight GNOME Shell extension that shows real-time network speed in the top bar.',
    tags: ['GNOME', 'Linux', 'Extension'],
    links: [
      { label: 'GitHub', href: 'https://github.com/piyushdoorwar/fluxbar' },
    ],
    stats: { githubRepo: 'piyushdoorwar/fluxbar' },
  },
  {
    id: 'devtools',
    name: 'DevTools',
    kind: 'Toolkit',
    tagline: 'A lightweight everyday developer utility toolkit.',
    description:
      'A collection of small, fast developer utilities bundled into one lightweight toolkit.',
    tags: ['Developer Tools', 'Utilities'],
    links: [
      { label: 'GitHub', href: 'https://github.com/piyushdoorwar/dev-tools' },
    ],
    stats: { githubRepo: 'piyushdoorwar/dev-tools' },
  },
]
