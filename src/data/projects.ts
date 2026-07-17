export type ProjectKind =
  | 'Desktop App'
  | 'VS Code Extension'
  | 'Chrome Extension'
  | 'GNOME Extension'
  | 'Toolkit'
  | 'Library'

export interface StatSource {
  /** GitHub "owner/repo" — used for aggregate stars and release downloads. */
  githubRepo?: string
  /** VS Code Marketplace id "publisher.extension" — used for aggregate installs. */
  vscodeExtension?: string
}

export interface Project {
  /** Stable key used when rendering the project list. */
  id: string
  name: string
  kind: ProjectKind
  tagline: string
  description: string
  tags: string[]
  featured?: boolean
  website: string
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
    website: 'https://piyushdoorwar.github.io/lumyn-media-player/',
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
    website: 'https://piyushdoorwar.github.io/gitable/',
    stats: {
      vscodeExtension: 'piyushdoorwar.gitable',
      githubRepo: 'piyushdoorwar/gitable',
    },
  },
  {
    id: 'npmll',
    name: 'npm LL',
    kind: 'VS Code Extension',
    tagline: 'Visual Studio-style npm package management in VS Code.',
    description:
      'A workspace-aware package manager for browsing dependencies, managing updates, and checking npm projects for vulnerabilities and deprecations.',
    tags: ['VS Code', 'npm', 'Node.js'],
    website: 'https://piyushdoorwar.github.io/npmll/',
    stats: {
      vscodeExtension: 'piyushdoorwar.npmll',
      githubRepo: 'piyushdoorwar/npmll',
    },
  },
  {
    id: 'nugetll',
    name: 'NuGet LL',
    kind: 'VS Code Extension',
    tagline: 'Visual Studio-style NuGet workflows in VS Code.',
    description:
      'A workspace-aware package manager for browsing NuGet packages, managing dependencies across .NET projects, and monitoring package health.',
    tags: ['VS Code', '.NET', 'NuGet'],
    website: 'https://piyushdoorwar.github.io/NuGetLL/',
    stats: {
      vscodeExtension: 'piyushdoorwar.getll',
      githubRepo: 'piyushdoorwar/NuGetLL',
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
    website: 'https://piyushdoorwar.github.io/ask-better/',
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
    website: 'https://piyushdoorwar.github.io/transmux/',
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
    website: 'https://piyushdoorwar.github.io/fluxbar/',
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
    website: 'https://piyushdoorwar.github.io/dev-tools/',
    stats: { githubRepo: 'piyushdoorwar/dev-tools' },
  },
]
