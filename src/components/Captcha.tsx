import { useCallback, useEffect, useRef, useState } from 'react'
import { CODE_LENGTH, CODE_TTL_MS, checkCode, makeCode, spoken } from '../human'
import { seeded } from '../seats'
import Icon from './Icon'

const W = 240
const H = 72
const INKS = ['#1d2a44', '#3b1f1a', '#1f3b2a', '#2b2b2b', '#4a2a52']
const FONTS = ['"Courier New", monospace', 'Georgia, serif', '"Trebuchet MS", sans-serif', 'Impact, sans-serif']

// Distorted characters on a noisy background: each character rotated, resized and nudged, the whole line bent by a
// sine wave and crossed by a curve. Fixed dark inks on a light ground, so it reads the same in every theme.
function drawCaptcha(cv: HTMLCanvasElement, code: string) {
  const rand = seeded(code + Date.now())
  const dpr = window.devicePixelRatio || 1
  cv.width = W * dpr
  cv.height = H * dpr
  const c = cv.getContext('2d')!
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.fillStyle = '#f1ece4'
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(70, 60, 50, ${0.15 + rand() * 0.35})`
    c.beginPath()
    c.arc(rand() * W, rand() * H, 0.5 + rand() * 1.4, 0, Math.PI * 2)
    c.fill()
  }
  for (let i = 0; i < 4; i++) {
    c.strokeStyle = `rgba(60, 50, 40, ${0.25 + rand() * 0.2})`
    c.lineWidth = 1 + rand()
    c.beginPath()
    c.moveTo(0, rand() * H)
    c.bezierCurveTo(W * 0.3, rand() * H, W * 0.7, rand() * H, W, rand() * H)
    c.stroke()
  }

  // Characters go on a scratch canvas first, then are copied across in thin strips shifted by a wave.
  const text = document.createElement('canvas')
  text.width = W * dpr
  text.height = H * dpr
  const t = text.getContext('2d')!
  t.setTransform(dpr, 0, 0, dpr, 0, 0)
  const step = (W - 30) / code.length
  code.split('').forEach((ch, i) => {
    t.save()
    t.translate(18 + i * step + rand() * 8, 46 + (rand() - 0.5) * 12)
    t.rotate((rand() - 0.5) * 0.8)
    t.fillStyle = INKS[Math.floor(rand() * INKS.length)]
    t.font = `700 ${26 + Math.round(rand() * 10)}px ${FONTS[Math.floor(rand() * FONTS.length)]}`
    t.fillText(ch, 0, 0)
    t.restore()
  })
  const amp = 4 + rand() * 3
  const period = 30 + rand() * 20
  const phase = rand() * Math.PI * 2
  for (let x = 0; x < W; x += 2) {
    const dy = Math.sin(x / period + phase) * amp
    c.drawImage(text, x * dpr, 0, 2 * dpr, H * dpr, x, dy, 2, H)
  }
  c.strokeStyle = INKS[0]
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(6, 30 + rand() * 20)
  c.bezierCurveTo(W * 0.35, rand() * H, W * 0.65, rand() * H, W - 6, 25 + rand() * 25)
  c.stroke()
}

// Holds the current code and what's been typed. The form checks it on submit, before the password.
export function useCaptcha() {
  const [code, setCode] = useState(() => makeCode())
  const [issuedAt, setIssuedAt] = useState(() => Date.now())
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback((why = '') => {
    setCode(makeCode())
    setIssuedAt(Date.now())
    setInput('')
    setNote(why)
  }, [])

  // Replace a code before it goes stale, so nobody types an expired one.
  useEffect(() => {
    const t = setTimeout(() => refresh('That code expired, so here\'s a new one.'), CODE_TTL_MS)
    return () => clearTimeout(t)
  }, [issuedAt, refresh])

  const check = () => checkCode(code, input, issuedAt, Date.now())
  const ready = input.replace(/\s+/g, '').length >= CODE_LENGTH
  return { code, input, setInput, note, refresh, check, ready, inputRef }
}

export type Captcha = ReturnType<typeof useCaptcha>

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export default function CaptchaField({ captcha, id }: { captcha: Captcha; id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) drawCaptcha(canvasRef.current, captcha.code)
  }, [captcha.code])
  useEffect(() => () => { if (canSpeak()) speechSynthesis.cancel() }, [])

  const listen = () => {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(spoken(captcha.code))
    u.lang = 'en-AU'
    u.rate = 0.8
    speechSynthesis.speak(u)
    captcha.inputRef.current?.focus()
  }

  return (
    <div className="captcha">
      <label htmlFor={id} className="field" style={{ gap: 2 }}>Verify you're human</label>
      <p className="tiny muted" id={`${id}-hint`}>Type the {CODE_LENGTH} characters in the picture. Capitals don't matter.</p>
      <div className="captcha-row">
        <canvas
          ref={canvasRef}
          className="captcha-img"
          role="img"
          aria-label={`Distorted security code of ${CODE_LENGTH} characters.${canSpeak() ? ' Use Listen to hear it.' : ''}`}
          style={{ width: W, height: H }}
        />
        <div className="captcha-tools">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { captcha.refresh(); captcha.inputRef.current?.focus() }} aria-label="Show a new code">
            <span aria-hidden="true">↻</span> New code
          </button>
          {canSpeak() && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={listen} aria-label="Listen to the code">
              <Icon name="volume" size={16} /> Listen
            </button>
          )}
        </div>
      </div>
      <input
        id={id}
        ref={captcha.inputRef}
        className="input captcha-input"
        value={captcha.input}
        onChange={(e) => captcha.setInput(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={CODE_LENGTH * 3}
        aria-describedby={`${id}-hint ${id}-note`}
        placeholder="Type the code"
      />
      <p id={`${id}-note`} className="small captcha-note" role="status">{captcha.note}</p>
    </div>
  )
}
