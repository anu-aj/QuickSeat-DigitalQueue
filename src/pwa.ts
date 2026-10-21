// Progressive web app: service worker registration and the "Install the app" offer.
import { useSyncExternalStore } from 'react'

// The browser's install offer (Chrome, Edge, Android). Not in TypeScript's DOM types yet.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let offer: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function registerPwa() {
  // Only on the hosted site: service workers can't run from a double-clicked file, and in dev they'd cache stale code.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // offer it from our own button rather than the browser's banner
    offer = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    offer = null
    emit()
  })
}

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

// iPhone/iPad Safari has no install prompt: people add it from the Share menu instead.
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export async function install() {
  if (!offer) return
  await offer.prompt()
  await offer.userChoice
  offer = null
  emit()
}

const snapshot = () => (offer ? 'offer' : installed ? 'installed' : 'none')

export function useInstall() {
  const state = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    snapshot,
  )
  return { canInstall: state === 'offer', standalone: isStandalone() || state === 'installed', ios: isIos() }
}
