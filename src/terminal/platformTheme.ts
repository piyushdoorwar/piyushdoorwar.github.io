export const terminalThemeIds = [
  'linux',
  'macos',
  'windows',
  'android',
  'ios',
  'generic',
] as const

export type TerminalThemeId = (typeof terminalThemeIds)[number]
export type TerminalThemePreference = 'auto' | TerminalThemeId

export interface TerminalTheme {
  id: TerminalThemeId
  label: string
  systemName: string
  shell: string
  prompt: string
  accent: string
  iconColor: string
  neofetchMark: string
  uname: string
}

export const terminalThemes: Record<TerminalThemeId, TerminalTheme> = {
  linux: {
    id: 'linux',
    label: 'Linux',
    systemName: 'Linux Portfolio Edition',
    shell: 'bash',
    prompt: '$',
    accent: '#a7b0be',
    iconColor: '#e2e8f0',
    neofetchMark: 'Tux',
    uname: 'Linux portfolio 6.8.0-portfolio #1 SMP x86_64 GNU/Linux',
  },
  macos: {
    id: 'macos',
    label: 'macOS',
    systemName: 'macOS Portfolio Edition',
    shell: 'zsh',
    prompt: '%',
    accent: '#74c0fc',
    iconColor: '#d8dee9',
    neofetchMark: '●',
    uname: 'Darwin portfolio 24.0.0 Darwin Kernel Version 24.0.0 arm64',
  },
  windows: {
    id: 'windows',
    label: 'Windows',
    systemName: 'Windows Portfolio Edition',
    shell: 'pwsh',
    prompt: 'PS>',
    accent: '#38bdf8',
    iconColor: '#00adef',
    neofetchMark: '⊞',
    uname: 'Windows_NT portfolio 10.0 x64 PowerShell',
  },
  android: {
    id: 'android',
    label: 'Android / Termux',
    systemName: 'Android Termux Portfolio',
    shell: 'sh',
    prompt: '$',
    accent: '#a4c639',
    iconColor: '#a4c639',
    neofetchMark: '◆',
    uname: 'Linux localhost 6.1.0-android aarch64 Android',
  },
  ios: {
    id: 'ios',
    label: 'iPhone / iPad',
    systemName: 'iOS Portfolio Edition',
    shell: 'zsh',
    prompt: '%',
    accent: '#c4b5fd',
    iconColor: '#d8dee9',
    neofetchMark: '●',
    uname: 'Darwin mobile 24.0.0 Darwin Kernel Version 24.0.0 arm64',
  },
  generic: {
    id: 'generic',
    label: 'Generic terminal',
    systemName: 'Portable Portfolio Terminal',
    shell: 'sh',
    prompt: '$',
    accent: '#22d3ee',
    iconColor: '#22d3ee',
    neofetchMark: '>_',
    uname: 'PortfolioOS portable 1.0 virtual terminal',
  },
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    platform?: string
  }
}

export function isTerminalThemeId(value: string | null): value is TerminalThemeId {
  return terminalThemeIds.includes(value as TerminalThemeId)
}

export function detectTerminalTheme(): TerminalThemeId {
  if (typeof navigator === 'undefined') return 'generic'

  const nav = navigator as NavigatorWithUAData
  const platform = `${nav.userAgentData?.platform ?? ''} ${nav.platform ?? ''}`.toLowerCase()
  const userAgent = nav.userAgent.toLowerCase()
  const device = `${platform} ${userAgent}`

  if (device.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(device)) return 'ios'
  if (platform.includes('mac') && nav.maxTouchPoints > 1) return 'ios'
  if (/windows|win32|win64/.test(device)) return 'windows'
  if (/macos|macintosh|macintel/.test(device)) return 'macos'
  if (/linux|x11/.test(device)) return 'linux'

  return 'generic'
}
