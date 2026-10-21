// Note Runner rules and the login human check. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AIRTIME, CEILING, MAX_SPEED, PLAYER_X, jump, newRun, nextGap, score, step } from './game/noteRunner.ts'
import { isSolved, looksHuman, makePuzzle } from './human.ts'
import { seeded } from './seats.ts'

const run = (s: ReturnType<typeof newRun>, seconds: number, rand = seeded('t')) => {
  for (let t = 0; t < seconds; t += 1 / 60) step(s, 1 / 60, rand)
}

test('a jump goes up and lands back on the ground', () => {
  const s = newRun(600)
  jump(s)
  assert.equal(s.status, 'running')
  run(s, 0.15)
  assert.ok(s.player.y > 40)
  s.obstacles = []
  s.nextSpawnAt = Infinity
  run(s, 1)
  assert.equal(s.player.y, 0)
  assert.equal(s.player.jumps, 0)
})

test('a second tap in mid-air is a shorter grace-note hop, and a third does nothing', () => {
  const s = newRun(600)
  s.nextSpawnAt = Infinity
  jump(s)
  run(s, 0.1)
  jump(s)
  assert.equal(s.player.jumps, 2)
  const vy = s.player.vy
  jump(s)
  assert.equal(s.player.vy, vy)
})

test('mashing jump never takes the note above the play area', () => {
  const s = newRun(600)
  s.nextSpawnAt = Infinity
  let highest = 0
  for (let i = 0; i < 300; i++) {
    jump(s)
    step(s, 1 / 60, seeded('x'))
    highest = Math.max(highest, s.player.y)
  }
  assert.ok(highest <= CEILING)
})

test('running into an instrument ends the run', () => {
  const s = newRun(600)
  s.status = 'running'
  s.nextSpawnAt = Infinity
  s.obstacles.push({ id: 1, kind: 'drum', x: PLAYER_X + 30, size: 36 })
  run(s, 0.5)
  assert.equal(s.status, 'over')
})

test('collecting a note adds a bonus to the score', () => {
  const s = newRun(600)
  s.status = 'running'
  s.nextSpawnAt = Infinity
  s.pickups.push({ id: 1, x: PLAYER_X + 20, y: 10, taken: false })
  const before = score(s)
  run(s, 0.2)
  assert.equal(s.bonus, 1)
  assert.ok(score(s) > before)
})

test('speed is capped and every gap between instruments can be cleared', () => {
  const s = newRun(600)
  s.status = 'running'
  s.nextSpawnAt = Infinity
  run(s, 120)
  assert.equal(s.speed, MAX_SPEED)
  const rand = seeded('gaps')
  for (let i = 0; i < 200; i++) {
    assert.ok(nextGap(rand, null) > AIRTIME)
    assert.ok(nextGap(rand, 0.25) > AIRTIME)
  }
})

test('the human check passes people and stops instant, input-free ticks', () => {
  assert.equal(looksHuman({ elapsedMs: 3000, pointerMoves: 12, keyPresses: 0 }), true)
  assert.equal(looksHuman({ elapsedMs: 2500, pointerMoves: 0, keyPresses: 6 }), true)
  assert.equal(looksHuman({ elapsedMs: 80, pointerMoves: 20, keyPresses: 0 }), false)
  assert.equal(looksHuman({ elapsedMs: 9000, pointerMoves: 0, keyPresses: 0 }), false)
})

test('the picture puzzle has exactly two targets and only both of them solve it', () => {
  for (let i = 0; i < 20; i++) {
    const p = makePuzzle(seeded(`p${i}`))
    const targets = p.tiles.map((t, j) => (t.kind === p.target ? j : -1)).filter((j) => j >= 0)
    assert.equal(p.tiles.length, 6)
    assert.equal(targets.length, 2)
    assert.equal(isSolved(p, targets), true)
    const wrong = p.tiles.findIndex((t) => t.kind !== p.target)
    assert.equal(isSolved(p, [targets[0], wrong]), false)
    assert.equal(isSolved(p, [targets[0]]), false)
  }
})
