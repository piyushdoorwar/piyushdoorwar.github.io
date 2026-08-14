import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTerminalState,
  loadTerminalState,
  saveTerminalState,
  type PersistedTerminalState,
} from './sessionPersistence'
import { createInitialShellSession } from './commandRegistry'

const STORAGE_KEY = 'portfolio-terminal-session'

function validState(): Omit<PersistedTerminalState, 'version' | 'introComplete'> {
  return {
    showIntro: true,
    entries: [{ command: 'whoami', output: ['Piyush Doorwar'], prompt: '$' }],
    commandHistory: ['whoami'],
    session: createInitialShellSession(),
  }
}

/** Writes straight past `saveTerminalState` so malformed payloads can be tested. */
function seed(raw: unknown) {
  window.localStorage.setItem(STORAGE_KEY, typeof raw === 'string' ? raw : JSON.stringify(raw))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('round trip', () => {
  it('restores what was saved', () => {
    const state = validState()
    saveTerminalState(state)

    const restored = loadTerminalState()
    expect(restored).toMatchObject(state)
  })

  it('stamps the version and intro marker the reader requires', () => {
    saveTerminalState(validState())
    expect(loadTerminalState()).toMatchObject({ version: 1, introComplete: true })
  })

  it('preserves the error flag on entries', () => {
    saveTerminalState({
      ...validState(),
      entries: [{ command: 'nope', output: ['not found'], prompt: '$', isError: true }],
    })
    expect(loadTerminalState()?.entries[0]?.isError).toBe(true)
  })

  it('round-trips an elevated session', () => {
    const session = { isRoot: true, cwd: '/root/secrets', startedAt: 1_700_000_000_000 }
    saveTerminalState({ ...validState(), session })
    expect(loadTerminalState()?.session).toEqual(session)
  })
})

describe('growth limits', () => {
  it('keeps only the most recent 100 entries', () => {
    const entries = Array.from({ length: 150 }, (_, index) => ({
      command: `command-${index}`,
      output: [`out-${index}`],
      prompt: '$',
    }))
    saveTerminalState({ ...validState(), entries })

    const restored = loadTerminalState()
    expect(restored?.entries).toHaveLength(100)
    // The oldest 50 are dropped, not the newest.
    expect(restored?.entries[0]?.command).toBe('command-50')
    expect(restored?.entries[99]?.command).toBe('command-149')
  })

  it('keeps only the most recent 100 history items', () => {
    const commandHistory = Array.from({ length: 150 }, (_, index) => `cmd-${index}`)
    saveTerminalState({ ...validState(), commandHistory })

    const restored = loadTerminalState()
    expect(restored?.commandHistory).toHaveLength(100)
    expect(restored?.commandHistory[0]).toBe('cmd-50')
  })

  it('leaves a short session untrimmed', () => {
    saveTerminalState(validState())
    expect(loadTerminalState()?.entries).toHaveLength(1)
  })
})

describe('rejecting untrusted storage', () => {
  it('returns null when nothing is stored', () => {
    expect(loadTerminalState()).toBeNull()
  })

  it('discards unparseable JSON', () => {
    seed('{ not json at all')
    expect(loadTerminalState()).toBeNull()
  })

  it.each([
    ['a future version', { ...validState(), version: 2, introComplete: true }],
    ['a missing intro marker', { ...validState(), version: 1 }],
    ['entries that are not an array', { ...validState(), version: 1, introComplete: true, entries: 'nope' }],
    [
      'an entry missing its output',
      { ...validState(), version: 1, introComplete: true, entries: [{ command: 'ls', prompt: '$' }] },
    ],
    [
      'output that is not all strings',
      { ...validState(), version: 1, introComplete: true, entries: [{ command: 'ls', prompt: '$', output: [1, 2] }] },
    ],
    [
      'a history containing non-strings',
      { ...validState(), version: 1, introComplete: true, commandHistory: ['ok', 5] },
    ],
    [
      'a session missing cwd',
      { ...validState(), version: 1, introComplete: true, session: { isRoot: false, startedAt: 1 } },
    ],
    [
      'a non-finite startedAt',
      { ...validState(), version: 1, introComplete: true, session: { isRoot: false, cwd: '~', startedAt: null } },
    ],
    ['a bare array', []],
    ['null', null],
  ])('discards %s', (_label, payload) => {
    seed(payload)
    expect(loadTerminalState()).toBeNull()
  })

  it('evicts a rejected payload so it is not re-parsed every load', () => {
    seed({ version: 99 })
    loadTerminalState()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('clearing', () => {
  it('removes a stored session', () => {
    saveTerminalState(validState())
    clearTerminalState()
    expect(loadTerminalState()).toBeNull()
  })

  it('is safe to call when nothing is stored', () => {
    expect(() => clearTerminalState()).not.toThrow()
  })
})

describe('when storage is unavailable', () => {
  it('keeps working if writes are blocked', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => saveTerminalState(validState())).not.toThrow()
  })

  it('treats an unreadable store as a fresh terminal', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    expect(loadTerminalState()).toBeNull()
  })

  it('still clears the visible terminal if removal is blocked', () => {
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    expect(() => clearTerminalState()).not.toThrow()
  })
})
