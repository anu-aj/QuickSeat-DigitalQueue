import { useEffect } from 'react'

const GLYPHS = ['♪', '♫', '♩', '♬']
const MAX_ALIVE = 12

// A little musical note pops up wherever you click or tap, then floats away. Purely decorative: it never takes the
// click (pointer-events: none), it's hidden from screen readers, and it's off for people who prefer reduced motion.
export default function NoteBursts() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onDown = (e: PointerEvent) => {
      if (document.querySelectorAll('.note-burst').length >= MAX_ALIVE) return
      const n = document.createElement('span')
      n.className = 'note-burst'
      n.setAttribute('aria-hidden', 'true')
      n.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      n.style.left = `${e.clientX}px`
      n.style.top = `${e.clientY}px`
      n.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 40)}px`)
      n.style.setProperty('--spin', `${Math.round((Math.random() - 0.5) * 50)}deg`)
      n.addEventListener('animationend', () => n.remove())
      document.body.appendChild(n)
    }
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.querySelectorAll('.note-burst').forEach((n) => n.remove())
    }
  }, [])
  return null
}
