import { useEffect, useRef, useState } from 'react'
import { VERIFIED_FOR_MS, isSolved, looksHuman, makePuzzle, puzzlePrompt, type Puzzle } from '../human'
import { instruments, type InstrumentId } from '../instruments'
import Icon from './Icon'

export function InstrumentIcon({ id, size = 40 }: { id: InstrumentId; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {instruments[id].layers.map((l, i) => <path key={i} d={l.d} fill={l.fill === 'ink' ? 'currentColor' : 'var(--tile-bg, #fff)'} />)}
    </svg>
  )
}

interface Props {
  // After repeated wrong passwords the quick check isn't enough: always ask for the puzzle.
  strict: boolean
  // Changing this clears a passed check (e.g. after a failed login).
  resetKey: number
  onChange: (verified: boolean) => void
}

type Stage = 'idle' | 'checking' | 'puzzle' | 'verified'

// "Verify you're human". Prototype only: see src/human.ts for what a real deployment needs.
export default function HumanCheck({ strict, resetKey, onChange }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [puzzle, setPuzzle] = useState<Puzzle>(() => makePuzzle())
  const [picked, setPicked] = useState<number[]>([])
  const [note, setNote] = useState('')
  const signals = useRef({ since: Date.now(), pointerMoves: 0, keyPresses: 0 })

  useEffect(() => {
    const move = () => { signals.current.pointerMoves++ }
    const key = () => { signals.current.keyPresses++ }
    document.addEventListener('pointermove', move)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('keydown', key)
    }
  }, [])

  const set = (s: Stage) => {
    setStage(s)
    onChange(s === 'verified')
  }

  useEffect(() => {
    if (resetKey) {
      setNote('Please verify again.')
      set('idle')
    }
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // A pass expires, like a real CAPTCHA token.
  useEffect(() => {
    if (stage !== 'verified') return
    const t = setTimeout(() => {
      setNote('Your check expired. Please verify again.')
      set('idle')
    }, VERIFIED_FOR_MS)
    return () => clearTimeout(t)
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const newPuzzle = () => {
    setPuzzle(makePuzzle())
    setPicked([])
  }

  const tick = () => {
    if (stage !== 'idle') return
    setNote('')
    set('checking')
    const s = signals.current
    const human = looksHuman({ elapsedMs: Date.now() - s.since, pointerMoves: s.pointerMoves, keyPresses: s.keyPresses })
    setTimeout(() => {
      if (human && !strict) return set('verified')
      newPuzzle()
      set('puzzle')
    }, 700)
  }

  const verify = () => {
    if (isSolved(puzzle, picked)) {
      setNote('')
      return set('verified')
    }
    setNote('Not quite. Here\'s a new one.')
    newPuzzle()
  }

  return (
    <div className={`human ${stage}`}>
      <div className="human-row">
        <button
          type="button"
          role="checkbox"
          aria-checked={stage === 'verified'}
          aria-describedby="human-note"
          className="human-box"
          onClick={tick}
          disabled={stage === 'checking'}
        >
          {stage === 'verified' ? <Icon name="check" size={18} /> : stage === 'checking' ? <span className="human-spin" aria-hidden="true" /> : null}
        </button>
        <span className="human-label">{stage === 'verified' ? 'Verified: you\'re human' : stage === 'checking' ? 'Checking…' : 'Verify you\'re human'}</span>
        <span className="human-brand" aria-hidden="true"><Icon name="shield" size={18} /> QuickSeat check</span>
      </div>

      {stage === 'puzzle' && (
        <fieldset className="human-puzzle">
          <legend><b>{puzzlePrompt(puzzle)}</b>, then press Verify.</legend>
          <div className="human-grid">
            {puzzle.tiles.map((t, i) => (
              <button
                key={i}
                type="button"
                className="human-tile"
                aria-pressed={picked.includes(i)}
                aria-label={instruments[t.kind].name}
                onClick={() => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].slice(-2)))}
              >
                <span style={{ transform: `rotate(${t.rotate}deg) scale(${t.scale})` }}><InstrumentIcon id={t.kind} size={44} /></span>
                {picked.includes(i) && <span className="human-tick" aria-hidden="true"><Icon name="check" size={14} /></span>}
              </button>
            ))}
          </div>
          <div className="row between">
            <button type="button" className="link-btn small" onClick={newPuzzle}>Show a different puzzle</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={picked.length !== 2} onClick={verify}>Verify</button>
          </div>
        </fieldset>
      )}
      <p id="human-note" className="small human-note" role="status">{note}</p>
    </div>
  )
}
