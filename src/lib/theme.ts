import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

// index.html reads this key before first paint so the app never flashes the wrong theme.
const STORAGE_KEY = 'pokedex:theme:v1'
const THEME_COLORS = { light: '#f4f4f5', dark: '#101012' }
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()
let preference = readPreference()

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Falls back to the system setting when storage is unavailable.
  }
  return 'system'
}

function applyTheme() {
  const theme = preference === 'system' ? (systemDark.matches ? 'dark' : 'light') : preference
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

systemDark.addEventListener('change', applyTheme)
applyTheme()

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // The choice still applies for this session.
  }
  applyTheme()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, () => preference)
}
