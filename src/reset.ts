// Full device reset, run at every login and logout (team decision, Oct 2026): nothing from one session carries over
// to the next on the same browser. Clears every QuickSeat key in localStorage and sessionStorage, empties the
// browser's Cache Storage, and tells each module holding data in memory to reset itself.
//
// What it can't clear: the browser's own HTTP cache. Only a server can ask for that (the Clear-Site-Data response
// header), and GitHub Pages can't send custom headers.

export const KEY_PREFIX = 'quickseat:'

type KeyStore = Pick<Storage, 'length' | 'key' | 'removeItem'>

// Removes QuickSeat's keys only, so other sites' or tools' data on the same origin is left alone. Returns the count.
export function clearQuickSeatKeys(store: KeyStore) {
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i)
    if (k?.startsWith(KEY_PREFIX)) keys.push(k)
  }
  keys.forEach((k) => store.removeItem(k))
  return keys.length
}

const listeners = new Set<() => void>()

// Modules with in-memory state (queues, music, theme, React stores) register here to reset with the device.
export function onDeviceReset(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function clearDevice() {
  for (const store of [() => localStorage, () => sessionStorage]) {
    try {
      clearQuickSeatKeys(store())
    } catch {
      // storage unavailable (e.g. private mode): nothing stored to clear
    }
  }
  if (typeof caches !== 'undefined') {
    void caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).catch(() => {})
  }
  listeners.forEach((fn) => fn())
}
