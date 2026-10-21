// "Verify you're human" at login: a quick check first, and an instrument picture puzzle when the quick check isn't
// confident or after repeated wrong passwords.
//
// Prototype only. A check that runs in the browser can be bypassed by anyone who edits the page; a real deployment
// should use a server-verified service such as Cloudflare Turnstile or hCaptcha, checked again on the server before
// the password is.
import { instrumentIds, instruments, type InstrumentId } from './instruments.ts'

export interface Signals {
  // Milliseconds between the form appearing and the check being ticked.
  elapsedMs: number
  pointerMoves: number
  keyPresses: number
}

// People take a moment and move a pointer or use the keyboard; scripts tick instantly with no input.
export const looksHuman = (s: Signals) => s.elapsedMs >= 1200 && (s.pointerMoves >= 3 || s.keyPresses >= 2)

export interface Puzzle {
  target: InstrumentId
  tiles: { kind: InstrumentId; rotate: number; scale: number }[]
}

export const puzzlePrompt = (p: Puzzle) => `Select both ${instruments[p.target].plural}`

// Six tiles: two of the target instrument and four different others, shuffled and slightly varied.
export function makePuzzle(rand: () => number = Math.random): Puzzle {
  const target = instrumentIds[Math.floor(rand() * instrumentIds.length)]
  const others = instrumentIds.filter((i) => i !== target).sort(() => rand() - 0.5).slice(0, 4)
  const kinds = [target, target, ...others].sort(() => rand() - 0.5)
  return { target, tiles: kinds.map((kind) => ({ kind, rotate: Math.round((rand() - 0.5) * 30), scale: 0.8 + rand() * 0.25 })) }
}

export const isSolved = (p: Puzzle, picked: number[]) =>
  picked.length === 2 && picked.every((i) => p.tiles[i]?.kind === p.target)

// A passed check is good for a couple of minutes, like a real CAPTCHA token.
export const VERIFIED_FOR_MS = 2 * 60_000
// After this many wrong passwords, the quick check is no longer enough.
export const STRICT_AFTER_FAILURES = 2
// After this many, logging in is paused briefly.
export const LOCK_AFTER_FAILURES = 5
export const LOCK_MS = 30_000
