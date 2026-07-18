import type { ShellSession } from './commandRegistry'

const TERMINAL_SESSION_STORAGE_KEY = 'portfolio-terminal-session'
const TERMINAL_SESSION_VERSION = 1
const MAX_TERMINAL_ENTRIES = 100
const MAX_COMMAND_HISTORY = 100

export interface PersistedTerminalEntry {
  command: string
  output: string[]
  prompt: string
  isError?: boolean
}

export interface PersistedTerminalState {
  version: typeof TERMINAL_SESSION_VERSION
  introComplete: true
  showIntro: boolean
  entries: PersistedTerminalEntry[]
  commandHistory: string[]
  session: ShellSession
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isTerminalEntry(value: unknown): value is PersistedTerminalEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<PersistedTerminalEntry>
  return typeof entry.command === 'string'
    && typeof entry.prompt === 'string'
    && isStringArray(entry.output)
    && (entry.isError === undefined || typeof entry.isError === 'boolean')
}

function isShellSession(value: unknown): value is ShellSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<ShellSession>
  return typeof session.isRoot === 'boolean'
    && typeof session.cwd === 'string'
    && typeof session.startedAt === 'number'
    && Number.isFinite(session.startedAt)
}

function isPersistedTerminalState(value: unknown): value is PersistedTerminalState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<PersistedTerminalState>
  return state.version === TERMINAL_SESSION_VERSION
    && state.introComplete === true
    && typeof state.showIntro === 'boolean'
    && Array.isArray(state.entries)
    && state.entries.every(isTerminalEntry)
    && isStringArray(state.commandHistory)
    && isShellSession(state.session)
}

export function loadTerminalState(): PersistedTerminalState | null {
  if (typeof window === 'undefined') return null

  try {
    const serialized = window.localStorage.getItem(TERMINAL_SESSION_STORAGE_KEY)
    if (!serialized) return null

    const parsed: unknown = JSON.parse(serialized)
    if (isPersistedTerminalState(parsed)) return parsed

    window.localStorage.removeItem(TERMINAL_SESSION_STORAGE_KEY)
  } catch {
    // Treat unavailable or malformed storage as a fresh terminal.
  }

  return null
}

export function saveTerminalState(
  state: Omit<PersistedTerminalState, 'version' | 'introComplete'>,
): void {
  if (typeof window === 'undefined') return

  const persistedState: PersistedTerminalState = {
    ...state,
    version: TERMINAL_SESSION_VERSION,
    introComplete: true,
    entries: state.entries.slice(-MAX_TERMINAL_ENTRIES),
    commandHistory: state.commandHistory.slice(-MAX_COMMAND_HISTORY),
  }

  try {
    window.localStorage.setItem(
      TERMINAL_SESSION_STORAGE_KEY,
      JSON.stringify(persistedState),
    )
  } catch {
    // Keep the in-memory terminal working when storage is blocked or full.
  }
}

export function clearTerminalState(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(TERMINAL_SESSION_STORAGE_KEY)
  } catch {
    // Clearing the visible terminal must still work without storage access.
  }
}
