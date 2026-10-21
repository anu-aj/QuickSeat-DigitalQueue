import { useEffect, useState } from 'react'
import { readStored, writeStored } from '../storage'
import Icon from './Icon'

const KEY = 'quickseat:runner-nudge'
// If it's ignored, it quietly goes away: one suggestion, not a nag.
const SHOW_FOR_MS = 25_000

interface Props {
  // The queue page decides when: the queue has visibly moved, nothing more important is on screen, game not started.
  show: boolean
}

// A once-per-session pointer to Note Runner, sitting just above the game with an arrow down to it, to help a long
// wait feel calmer. "Take me there" scrolls to the game and highlights it rather than starting it.
export default function RunnerNudge({ show }: Props) {
  const [done, setDone] = useState(() => readStored(KEY, false, true))
  const visible = show && !done

  const finish = () => {
    writeStored(KEY, true, true)
    setDone(true)
  }

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(finish, SHOW_FOR_MS)
    return () => clearTimeout(t)
  }, [visible])

  if (!visible) return null

  const go = () => {
    finish()
    // Scroll once the pointer has gone: removing it shifts the page, which would make the scroll overshoot.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const game = document.getElementById('note-runner')
      if (!game) return
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      game.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      game.classList.remove('runner-spotlight')
      void game.offsetWidth // restart the highlight if it was shown before
      game.classList.add('runner-spotlight')
      setTimeout(() => game.classList.remove('runner-spotlight'), 2400)
      document.getElementById('note-runner-play')?.focus({ preventScroll: true })
    }))
  }

  return (
    <aside className="runner-nudge" aria-label="Something to do while you wait">
      <span className="runner-nudge-note" aria-hidden="true"><Icon name="music" size={18} /></span>
      <span className="small runner-nudge-text">
        <b>While you wait, play Note Runner.</b> Your place keeps moving, and we'll pause the game if anything changes.
      </span>
      <button className="btn btn-primary btn-sm" onClick={go}>Take me there <span className="nudge-arrow" aria-hidden="true">↓</span></button>
      <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="No thanks, hide this" onClick={finish}><Icon name="x" size={16} /></button>
    </aside>
  )
}
