import { useSyncExternalStore } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

const DISMISS_KEY = 'pokedex:install-hint:v1'
const listeners = new Set<() => void>()
let deferredPrompt: InstallPromptEvent | null = null
let dismissed = readDismissed()

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === 'dismissed'
  } catch {
    return false
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt = event as InstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  notify()
})

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

type InstallHint = 'prompt' | 'ios' | null

function getHint(): InstallHint {
  if (dismissed || isStandalone()) return null
  if (deferredPrompt) return 'prompt'
  return isIos() ? 'ios' : null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useInstallHint() {
  return useSyncExternalStore(subscribe, getHint, () => null)
}

export async function promptInstall() {
  if (!deferredPrompt) return
  await deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = null
  notify()
}

export function dismissInstallHint() {
  dismissed = true
  try {
    window.localStorage.setItem(DISMISS_KEY, 'dismissed')
  } catch {
    // The hint stays hidden for this session when storage is unavailable.
  }
  notify()
}
