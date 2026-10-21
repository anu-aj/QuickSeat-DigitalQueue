import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYER_H, PLAYER_W, PLAYER_X, jump, newRun, score, step, type RunnerState } from '../game/noteRunner'
import { instruments } from '../instruments'
import { currentBeat, pause, play, setPrefs, useMusic, usePrefs } from '../audio'
import { readStored, writeStored } from '../storage'
import { seeded } from '../seats'
import Icon from './Icon'

interface Props {
  artistName: string
  // Shown in the game's corner, so the queue never drops out of sight while playing ("1,925 ahead").
  status?: string
  // Extra detail for the corner pill on wider screens ("Section 34").
  detail?: string
  // What happens to the wait while playing; differs between the waiting room and the queue.
  waitNote?: string
  // Called when the fan first presses Play (the queue page stops suggesting the game).
  onStart?: () => void
  // When this key changes, something needs the fan (a plan change): the game pauses and says why.
  interrupt?: { key: string | number; message: string } | null
}

const HEIGHT = 200
const GROUND = 30
const BEST_KEY = 'quickseat:note-runner-best'

interface Palette { accent: string; ink: string; muted: string; line: string; paper: string }

function palette(): Palette {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return { accent: v('--accent', '#111'), ink: v('--ink', '#1a1a1a'), muted: v('--ink-muted', '#5f5a54'), line: v('--border', '#e6e0d8'), paper: v('--bg', '#fff') }
}

// An eighth note inside a w×h box whose top-left is (x, y).
function drawNote(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, tilt = 0) {
  c.save()
  c.translate(x + w / 2, y + h / 2)
  c.rotate(tilt)
  c.fillStyle = color
  c.strokeStyle = color
  c.beginPath()
  c.ellipse(-w * 0.12, h * 0.3, w * 0.36, w * 0.26, -0.35, 0, Math.PI * 2)
  c.fill()
  c.lineWidth = Math.max(2, w * 0.11)
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(w * 0.2, h * 0.26)
  c.lineTo(w * 0.2, -h * 0.48)
  c.quadraticCurveTo(w * 0.32, -h * 0.18, w * 0.55, -h * 0.12)
  c.stroke()
  c.restore()
}

const LEGS = 12

// The player: an eighth note with little eyes that blink and legs that run on the ground and tuck up mid-jump.
// (x, y, w, h) is the same box as drawNote; the body is lifted by the leg length so the feet touch the ground.
function drawCritter(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pal: Palette, s: RunnerState, now: number) {
  const p = s.player
  const airborne = p.y > 0
  const tilt = airborne ? -p.vy / 3000 : 0
  const hx = -w * 0.12
  const hy = h * 0.3
  const headBottom = hy + w * 0.26

  c.save()
  c.translate(x + w / 2, y + h / 2 - LEGS)
  c.rotate(tilt)

  // Legs first, so the head sits on top of them.
  c.strokeStyle = pal.accent
  c.lineWidth = 2.2
  c.lineCap = 'round'
  const stride = s.status === 'running' && !airborne ? Math.sin(s.distance / 7) * 4 : 0
  for (const [side, swing] of [[-1, stride], [1, -stride]] as const) {
    const hipX = hx + side * 4
    const footX = airborne ? hipX - 3 : hipX + swing
    const footY = airborne ? headBottom + LEGS * 0.55 : headBottom + LEGS
    c.beginPath()
    c.moveTo(hipX, headBottom - 2)
    c.lineTo(footX, footY)
    c.lineTo(footX + 3.5, footY) // a little foot pointing forward
    c.stroke()
  }

  // Body: the note head and its stem and flag.
  c.restore()
  drawNote(c, x, y - LEGS, w, h, pal.accent, tilt)
  c.save()
  c.translate(x + w / 2, y + h / 2 - LEGS)
  c.rotate(tilt)

  // Eyes looking forward; a quick blink every few seconds.
  const blink = now % 3200 < 130
  for (const ex of [hx - w * 0.11, hx + w * 0.12]) {
    const ey = hy - 1.5
    if (blink) {
      c.strokeStyle = pal.paper
      c.lineWidth = 1.5
      c.beginPath()
      c.moveTo(ex - 2.4, ey)
      c.lineTo(ex + 2.4, ey)
      c.stroke()
      continue
    }
    c.fillStyle = pal.paper
    c.beginPath()
    c.arc(ex, ey, 3, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = pal.ink
    c.beginPath()
    c.arc(ex + 1, ey + (airborne ? -0.6 : 0.4), 1.5, 0, Math.PI * 2)
    c.fill()
  }
  c.restore()
}

const paths = new Map<string, Path2D>()
const path2d = (d: string) => paths.get(d) ?? paths.set(d, new Path2D(d)).get(d)!

function draw(c: CanvasRenderingContext2D, s: RunnerState, w: number, pal: Palette, best: number) {
  const ground = HEIGHT - GROUND
  c.clearRect(0, 0, w, HEIGHT)

  // A music staff across the sky, with bar lines scrolling past.
  c.strokeStyle = pal.line
  c.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    c.beginPath()
    c.moveTo(0, 34 + i * 10)
    c.lineTo(w, 34 + i * 10)
    c.stroke()
  }
  const bar = 260
  for (let x = bar - (s.distance % bar); x < w; x += bar) {
    c.beginPath()
    c.moveTo(x, 34)
    c.lineTo(x, 74)
    c.stroke()
  }
  c.strokeStyle = pal.ink
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(0, ground + 0.5)
  c.lineTo(w, ground + 0.5)
  c.stroke()

  for (const k of s.pickups) if (!k.taken) drawNote(c, k.x - 8, ground - k.y - 10 + Math.sin((s.distance + k.x) / 30) * 3, 16, 20, pal.accent)

  for (const o of s.obstacles) {
    c.save()
    c.translate(o.x, ground - o.size)
    c.scale(o.size / 32, o.size / 32)
    for (const layer of instruments[o.kind].layers) {
      c.fillStyle = layer.fill === 'ink' ? pal.muted : pal.paper
      c.fill(path2d(layer.d))
    }
    c.restore()
  }

  const p = s.player
  drawCritter(c, PLAYER_X - 4, ground - p.y - PLAYER_H, PLAYER_W + 8, PLAYER_H, pal, s, performance.now())

  c.fillStyle = pal.ink
  c.font = '600 13px Inter, system-ui, sans-serif'
  c.textAlign = 'right'
  c.fillText(`♪ ${String(score(s)).padStart(4, '0')}`, w - 12, 22)
  c.fillStyle = pal.muted
  c.fillText(`Best ${String(best).padStart(4, '0')}`, w - 12, 40)
}

// While you wait: hop your note over instruments. Only on the waiting room and the queue, never at your turn.
export default function NoteRunner({ artistName, status, detail, interrupt, onStart, waitNote = 'Your place in the queue keeps moving while you play, and the game pauses if your plan changes.' }: Props) {
  const music = useMusic()
  const prefs = usePrefs()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const game = useRef<RunnerState | null>(null)
  const raf = useRef(0)
  const last = useRef(0)
  const rand = useRef(seeded(String(Date.now())))
  const pal = useRef<Palette | null>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<RunnerState['status']>('ready')
  const [reason, setReason] = useState<string | null>(null)
  const [best, setBest] = useState(() => readStored(BEST_KEY, 0))
  const [final, setFinal] = useState(0)
  const bestRef = useRef(best)
  bestRef.current = best

  const width = () => wrapRef.current?.clientWidth ?? 600

  const paint = useCallback(() => {
    const cv = canvasRef.current
    const s = game.current
    if (!cv || !s) return
    const c = cv.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(c, s, s.width, pal.current ?? (pal.current = palette()), bestRef.current)
  }, [])

  const resize = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const w = width()
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(HEIGHT * dpr)
    cv.style.height = `${HEIGHT}px`
    if (game.current) game.current.width = w
    paint()
  }, [paint])

  const loop = useCallback((now: number) => {
    const s = game.current
    if (!s || s.status !== 'running') return
    const dt = last.current ? (now - last.current) / 1000 : 0
    last.current = now
    const ev = step(s, dt, rand.current, currentBeat())
    paint()
    if (ev.crashed) {
      const sc = score(s)
      setFinal(sc)
      setPhase('over')
      if (sc > bestRef.current) {
        setBest(sc)
        writeStored(BEST_KEY, sc)
      }
      return
    }
    raf.current = requestAnimationFrame(loop)
  }, [paint])

  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    last.current = 0
    setPhase('running')
    setReason(null)
    raf.current = requestAnimationFrame(loop)
    canvasRef.current?.focus({ preventScroll: true })
  }, [loop])

  // Starting the game is a click, so the soundtrack can start with it (the record spins; its card stays closed).
  const startMusic = () => {
    if (prefs.gameMusic && !music.playing) play({ expand: false })
  }

  const start = () => {
    setOpen(true)
    onStart?.()
    startMusic()
    // Wait a frame for the canvas to mount before sizing it.
    requestAnimationFrame(() => {
      pal.current = palette()
      game.current = newRun(width())
      resize()
      jump(game.current)
      run()
    })
  }

  const pauseGame = useCallback((why: string) => {
    const s = game.current
    if (!s || s.status !== 'running') return
    s.status = 'paused'
    cancelAnimationFrame(raf.current)
    setPhase('paused')
    setReason(why)
  }, [])

  const resume = () => {
    const s = game.current
    if (!s) return
    if (s.status === 'over') {
      game.current = newRun(width())
      jump(game.current)
    } else {
      s.status = 'running'
    }
    startMusic()
    run()
  }

  const press = () => {
    const s = game.current
    if (!s) return start()
    if (s.status === 'running') jump(s)
    else resume()
  }

  // A plan change pauses the game, so it never competes with the alert.
  useEffect(() => {
    if (interrupt) pauseGame(interrupt.message)
  }, [interrupt?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHide = () => document.hidden && pauseGame('Paused while you were away.')
    document.addEventListener('visibilitychange', onHide)
    const ro = new ResizeObserver(() => resize())
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      ro.disconnect()
      cancelAnimationFrame(raf.current)
    }
  }, [pauseGame, resize, open])

  const toggleMusic = (on: boolean) => {
    setPrefs({ gameMusic: on })
    if (on && phase === 'running' && !music.playing) play({ expand: false })
    if (!on && music.playing) pause()
  }

  return (
    <section id="note-runner" className="card stack runner" aria-labelledby="runner-h">
      <div className="row between">
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="eyebrow">While you wait</span>
          <h2 id="runner-h" style={{ fontSize: 20 }}>Note Runner</h2>
        </div>
        <label className="checkbox small">
          <input type="checkbox" checked={prefs.gameMusic} onChange={(e) => toggleMusic(e.target.checked)} />
          <span><Icon name="music" size={16} /> Play the {artistName} soundtrack while I play</span>
        </label>
      </div>
      <p className="small muted">
        Hop your note over the instruments. Tap, click or press Space to jump; tap again in the air for a grace-note hop. {waitNote}
      </p>

      {!open ? (
        <div><button id="note-runner-play" className="btn btn-primary" onClick={start}><Icon name="play" size={16} /> Play Note Runner</button></div>
      ) : (
        <div className="runner-stage" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="img"
            aria-label={`Note Runner game. ${phase === 'over' ? `Game over, score ${final}.` : 'Press Space to jump.'} Best score ${best}.`}
            onPointerDown={(e) => { e.preventDefault(); press() }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); press() }
              if (e.key === 'p' || e.key === 'Escape') pauseGame('Paused.')
            }}
          />
          {status && <span className="runner-status">{status}{detail && <span className="runner-detail"> · {detail}</span>}</span>}
          {phase !== 'running' && (
            <div className="runner-overlay" role="status">
              {phase === 'over' ? (
                <>
                  <strong>Crash! Score {final}{final >= best && final > 0 ? ' · new best' : ''}</strong>
                  <button className="btn btn-primary btn-sm" onClick={resume}>Play again</button>
                </>
              ) : (
                <>
                  <strong>{reason ?? 'Paused'}</strong>
                  <button className="btn btn-primary btn-sm" onClick={resume}>Resume</button>
                </>
              )}
            </div>
          )}
          {phase === 'running' && (
            <button className="icon-btn runner-pause" aria-label="Pause the game" onClick={() => pauseGame('Paused.')}><Icon name="pause" size={18} /></button>
          )}
        </div>
      )}
    </section>
  )
}
