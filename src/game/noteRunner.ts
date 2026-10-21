// Note Runner: a small endless runner played while waiting. A music note hops over instruments.
// Pure TypeScript (no React, no canvas) so the rules can be unit-tested; NoteRunner.tsx draws it.
import { instrumentIds, type InstrumentId } from '../instruments.ts'

// Heights are measured upwards from the ground line; x is from the left edge of the play area.
export const PLAYER_X = 56
export const PLAYER_W = 22
export const PLAYER_H = 34
export const GRAVITY = 2400
export const JUMP_V = 700
// A shorter second hop in mid-air: the "grace note".
export const GRACE_V = 450
// The highest the note's feet can go, so even a double hop stays inside the play area.
export const CEILING = 128
export const START_SPEED = 300
export const MAX_SPEED = 640
export const ACCEL = 9
// Time a single jump spends in the air; spawn gaps are always longer than this so every run is clearable.
export const AIRTIME = (2 * JUMP_V) / GRAVITY

export interface Obstacle { id: number; kind: InstrumentId; x: number; size: number }
export interface Pickup { id: number; x: number; y: number; taken: boolean }

export interface RunnerState {
  width: number
  status: 'ready' | 'running' | 'paused' | 'over'
  speed: number
  distance: number
  bonus: number
  player: { y: number; vy: number; jumps: number }
  obstacles: Obstacle[]
  pickups: Pickup[]
  nextSpawnAt: number
  ids: number
}

export const score = (s: RunnerState) => Math.floor(s.distance / 30) + s.bonus * 5

export function newRun(width: number): RunnerState {
  return {
    width,
    status: 'ready',
    speed: START_SPEED,
    distance: 0,
    bonus: 0,
    player: { y: 0, vy: 0, jumps: 0 },
    obstacles: [],
    pickups: [],
    nextSpawnAt: width * 0.6,
    ids: 0,
  }
}

export function jump(s: RunnerState) {
  if (s.status === 'ready') s.status = 'running'
  if (s.status !== 'running') return
  if (s.player.jumps === 0 && s.player.y <= 0) {
    s.player.vy = JUMP_V
    s.player.jumps = 1
  } else if (s.player.jumps === 1) {
    s.player.vy = GRACE_V
    s.player.jumps = 2
  }
}

// Seconds until the next obstacle. With music playing, gaps fall on the beat of the soundtrack.
export function nextGap(rand: () => number, beat: number | null) {
  const min = AIRTIME + 0.22
  if (beat) {
    const beats = [1, 1.5, 2, 3][Math.floor(rand() * 4)]
    return Math.max(min, beats * beat)
  }
  return min + rand() * 0.9
}

const overlaps = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

export interface StepEvents { crashed: boolean; collected: number }

// Advances the run by dt seconds. Mutates and returns what happened, so the view can react (sound, overlay).
export function step(s: RunnerState, dt: number, rand: () => number, beat: number | null = null): StepEvents {
  const ev: StepEvents = { crashed: false, collected: 0 }
  if (s.status !== 'running') return ev
  dt = Math.min(dt, 0.05) // a long frame (tab switch) must not teleport the player through an obstacle

  s.speed = Math.min(MAX_SPEED, s.speed + ACCEL * dt)
  const dx = s.speed * dt
  s.distance += dx

  const p = s.player
  p.vy -= GRAVITY * dt
  p.y = Math.max(0, p.y + p.vy * dt)
  if (p.y > CEILING) {
    p.y = CEILING
    p.vy = Math.min(p.vy, 0)
  }
  if (p.y === 0 && p.vy < 0) {
    p.vy = 0
    p.jumps = 0
  }

  for (const o of s.obstacles) o.x -= dx
  for (const k of s.pickups) k.x -= dx
  s.obstacles = s.obstacles.filter((o) => o.x + o.size > -10)
  s.pickups = s.pickups.filter((k) => k.x > -20 && !k.taken)

  if (s.distance >= s.nextSpawnAt) {
    const size = 26 + Math.round(rand() * 18)
    s.obstacles.push({ id: ++s.ids, kind: instrumentIds[Math.floor(rand() * instrumentIds.length)], x: s.width + 10, size })
    const gap = nextGap(rand, beat) * s.speed
    if (rand() < 0.45) s.pickups.push({ id: ++s.ids, x: s.width + 10 + gap / 2, y: 64 + rand() * 50, taken: false })
    s.nextSpawnAt = s.distance + gap
  }

  // Hit boxes are a little smaller than the drawings, so near misses feel fair.
  const inset = 4
  for (const o of s.obstacles) {
    if (overlaps(PLAYER_X + inset, p.y, PLAYER_W - inset * 2, PLAYER_H - inset, o.x + inset, 0, o.size - inset * 2, o.size - inset)) {
      s.status = 'over'
      ev.crashed = true
      return ev
    }
  }
  for (const k of s.pickups) {
    if (!k.taken && overlaps(PLAYER_X, p.y, PLAYER_W, PLAYER_H, k.x - 8, k.y - 8, 16, 16)) {
      k.taken = true
      s.bonus++
      ev.collected++
    }
  }
  return ev
}
