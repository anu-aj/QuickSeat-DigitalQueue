import { useEffect, useState } from 'react'
import { readStored, writeStored } from '../storage'
import Icon from './Icon'

const KEY = 'quickseat:runner-nudge'
// Give people a moment to settle into the queue before suggesting anything.
const DELAY_MS = 12_000
// If it's ignored, it quietly goes away: one suggestion, not a nag.
const SHOW_FOR_MS = 25_000

interface Props {
  // Only for a long wait with nothing more important on screen (no fresh alert, no decision).
  show: boolean
}

// A gentle, once-per-session pointer to Note Runner, to help a long wait feel shorter. It never appears once the
// game has been seen, and "Play while I wait" scrolls to the game and highlights it rather than starting it.
export default function RunnerNudge({ show }: Props) {
  const [done, setDone] = useState(() => readStored(KEY, false, true))
  const [ready, setReady] = useState(false)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  // Someone who has already scrolled to the game doesn't need pointing to it.
  useEffect(() => {
    const el = document.getElementById('note-runner')
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [show])

  const visible = show && ready && !done && !seen
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
    // Scroll once the nudge has gone: removing it shifts the page up, which would make the scroll overshoot.
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
      <span className="small runner-nudge-text"><b>Long wait ahead?</b> Hop a few notes in Note Runner. Your place keeps moving, and we'll pause the game if anything changes.</span>
      <button className="btn btn-secondary btn-sm" onClick={go}>Play while I wait <Icon name="arrowRight" size={14} /></button>
      <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="No thanks, hide this" onClick={finish}><Icon name="x" size={16} /></button>
    </aside>
  )
}
