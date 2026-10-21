// Device reset at login/logout. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clearDevice, clearQuickSeatKeys, onDeviceReset } from './reset.ts'

function fakeStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries))
  return {
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k) },
    keys: () => [...map.keys()],
  }
}

test('clears every QuickSeat key, including session flags, theme and preferences', () => {
  const store = fakeStorage({
    'quickseat:v2:users': '[]',
    'quickseat:v2:session': '"customer"',
    'quickseat:v2:bookings': '[]',
    'quickseat:theme': '{}',
    'quickseat:theme-tokens': '{}',
    'quickseat:audio-prefs': '{}',
    'quickseat:note-runner-best': '120',
    'quickseat:nudged:customer:ptd-mel:28': 'true',
  })
  assert.equal(clearQuickSeatKeys(store), 8)
  assert.deepEqual(store.keys(), [])
})

test('leaves data that isn\'t QuickSeat\'s alone', () => {
  const store = fakeStorage({ 'quickseat:v2:plans': '{}', 'other-app:token': 'x', 'quickseatish': 'y' })
  clearQuickSeatKeys(store)
  assert.deepEqual(store.keys(), ['other-app:token', 'quickseatish'])
})

test('every registered module is told to reset, and can unsubscribe', () => {
  let calls = 0
  const off = onDeviceReset(() => { calls++ })
  clearDevice() // no browser storage in Node: must not throw
  assert.equal(calls, 1)
  off()
  clearDevice()
  assert.equal(calls, 1)
})
