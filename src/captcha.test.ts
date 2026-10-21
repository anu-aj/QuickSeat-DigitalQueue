// Text CAPTCHA at log in and sign up. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALPHABET, CODE_LENGTH, CODE_TTL_MS, checkCode, makeCode, normalise, spoken } from './human.ts'
import { seeded } from './seats.ts'

test('codes are the right length and never use look-alike characters', () => {
  const rand = seeded('codes')
  for (let i = 0; i < 500; i++) {
    const code = makeCode(rand)
    assert.equal(code.length, CODE_LENGTH)
    assert.match(code, /^[A-Z2-9]+$/)
    assert.doesNotMatch(code, /[01OILS5]/)
    for (const c of code) assert.ok(ALPHABET.includes(c))
  }
})

test('codes vary from one attempt to the next', () => {
  const rand = seeded('vary')
  const codes = new Set(Array.from({ length: 200 }, () => makeCode(rand)))
  assert.ok(codes.size > 195)
})

test('typing is forgiving about case and spaces, but every character must match', () => {
  assert.equal(normalise(' k7r 4mx '), 'K7R4MX')
  assert.equal(checkCode('K7R4MX', 'k7r4mx', 0, 1000), 'ok')
  assert.equal(checkCode('K7R4MX', 'K7R4M', 0, 1000), 'wrong')
  assert.equal(checkCode('K7R4MX', 'K7R4MY', 0, 1000), 'wrong')
  assert.equal(checkCode('K7R4MX', '', 0, 1000), 'wrong')
})

test('a code expires after two minutes, even if typed correctly', () => {
  assert.equal(checkCode('K7R4MX', 'K7R4MX', 0, CODE_TTL_MS), 'ok')
  assert.equal(checkCode('K7R4MX', 'K7R4MX', 0, CODE_TTL_MS + 1), 'expired')
})

test('Listen spells letters phonetically so similar sounds can\'t be confused', () => {
  assert.equal(spoken('K7B'), 'K for kilo, 7, B for bravo')
})
