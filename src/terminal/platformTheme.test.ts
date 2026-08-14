import { describe, expect, it, vi } from 'vitest'
import { detectTerminalTheme, terminalThemes, type TerminalThemeId } from './platformTheme'

interface FakeNavigator {
  platform?: string
  userAgent: string
  maxTouchPoints?: number
  userAgentData?: { platform?: string }
}

function withNavigator(navigatorLike: FakeNavigator): TerminalThemeId {
  vi.stubGlobal('navigator', navigatorLike)
  return detectTerminalTheme()
}

describe('detectTerminalTheme', () => {
  it('detects Android before anything else', () => {
    expect(
      withNavigator({
        platform: 'Linux armv8l',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
      }),
    ).toBe('android')
  })

  it.each(['iPhone', 'iPad', 'iPod'])('detects %s as Apple', (device) => {
    expect(withNavigator({ platform: device, userAgent: `Mozilla/5.0 (${device}; CPU OS 17_0)` })).toBe('apple')
  })

  it('detects an iPad that reports itself as desktop Safari', () => {
    // iPadOS 13+ claims MacIntel; touch points are what give it away.
    expect(
      withNavigator({
        platform: 'MacIntel',
        maxTouchPoints: 5,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15',
      }),
    ).toBe('apple')
  })

  it('detects a real Mac with no touch screen', () => {
    expect(
      withNavigator({
        platform: 'MacIntel',
        maxTouchPoints: 0,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120',
      }),
    ).toBe('apple')
  })

  it('detects Windows', () => {
    expect(
      withNavigator({
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
      }),
    ).toBe('windows')
  })

  it('detects desktop Linux', () => {
    expect(
      withNavigator({
        platform: 'Linux x86_64',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120',
      }),
    ).toBe('linux')
  })

  it('prefers userAgentData over the legacy platform string', () => {
    expect(
      withNavigator({
        userAgentData: { platform: 'Windows' },
        platform: '',
        userAgent: 'Mozilla/5.0 (Unknown)',
      }),
    ).toBe('windows')
  })

  it('falls back to a generic terminal for anything unrecognised', () => {
    expect(withNavigator({ platform: 'PlayStation', userAgent: 'Mozilla/5.0 (PlayStation 5)' })).toBe('generic')
  })

  it('does not throw when the platform fields are absent', () => {
    expect(withNavigator({ userAgent: '' })).toBe('generic')
  })
})

describe('theme table', () => {
  it('is keyed consistently with each theme id', () => {
    for (const [id, theme] of Object.entries(terminalThemes)) {
      expect(theme.id).toBe(id)
    }
  })

  it('gives every theme the fields the terminal renders', () => {
    for (const theme of Object.values(terminalThemes)) {
      expect(theme.label.length).toBeGreaterThan(0)
      expect(theme.shell.length).toBeGreaterThan(0)
      expect(theme.prompt.length).toBeGreaterThan(0)
      expect(theme.uname.length).toBeGreaterThan(0)
      expect(theme.systemName.length).toBeGreaterThan(0)
      expect(theme.neofetchMark.length).toBeGreaterThan(0)
      // Both colours are injected straight into inline styles.
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.iconColor).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('covers every declared theme id', () => {
    const ids: TerminalThemeId[] = ['linux', 'apple', 'windows', 'android', 'generic']
    expect(Object.keys(terminalThemes).sort()).toEqual([...ids].sort())
  })
})
