// Text CAPTCHA at log in and sign up: type the distorted characters. Every attempt gets a fresh code.
//
// Prototype only. The code lives in the page, so a script that reads the page can pass it. A real deployment must
// generate and check the code on the server (or use a server-verified service such as Cloudflare Turnstile or
// hCaptcha) before it even looks at the password.

// No look-alikes: 0/O, 1/I/L and 5/S are left out. Checking ignores case, so case can't trip anyone up either.
export const ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ2346789'
export const CODE_LENGTH = 6
// A code that has sat on screen this long is replaced, like a real CAPTCHA.
export const CODE_TTL_MS = 2 * 60_000
// After this many wrong passwords, logging in is paused briefly.
export const LOCK_AFTER_FAILURES = 5
export const LOCK_MS = 30_000

export function makeCode(rand: () => number = Math.random, length = CODE_LENGTH) {
  return Array.from({ length }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('')
}

// What people actually type: any case, with stray spaces.
export const normalise = (typed: string) => typed.replace(/\s+/g, '').toUpperCase()

export type CodeCheck = 'ok' | 'wrong' | 'expired'

export function checkCode(code: string, typed: string, issuedAt: number, now: number): CodeCheck {
  if (now - issuedAt > CODE_TTL_MS) return 'expired'
  return normalise(typed) === code ? 'ok' : 'wrong'
}

const phonetic: Record<string, string> = {
  A: 'alpha', B: 'bravo', C: 'charlie', D: 'delta', E: 'echo', F: 'foxtrot', G: 'golf', H: 'hotel', J: 'juliet',
  K: 'kilo', M: 'mike', N: 'november', P: 'papa', Q: 'quebec', R: 'romeo', T: 'tango', U: 'uniform', V: 'victor',
  W: 'whiskey', X: 'x-ray', Y: 'yankee', Z: 'zulu',
}

// For "Listen": "K for kilo, 7, R for romeo, ..." so similar-sounding letters can't be confused.
export const spoken = (code: string) =>
  code.split('').map((c) => (phonetic[c] ? `${c} for ${phonetic[c]}` : c)).join(', ')
