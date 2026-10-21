import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Artist, Milestone } from '../types'
import { openSpotify, playClip } from '../audio'
import Icon from './Icon'

export const kindLabel: Record<Milestone['kind'], string> = {
  'first-release': 'First release',
  breakthrough: 'Breakthrough',
  'biggest-hit': 'Biggest hit',
  milestone: 'Milestone',
  'this-tour': 'This tour',
}

interface Props {
  artist: Artist
  eyebrow?: string
  // Inside a collapsible "While you wait" panel: no card or heading of its own.
  compact?: boolean
}

// The artist's career as a timeline: one marker per milestone on a year axis. Opening one can play a snippet
// through the record player.
export default function StoryTimeline({ artist, eyebrow = 'While you wait', compact }: Props) {
  const [open, setOpen] = useState<number | null>(null)
  const pins = useRef<(HTMLButtonElement | null)[]>([])
  const ms = artist.milestones
  // Spread markers by year but keep same-year milestones apart.
  const positions = useMemo(() => {
    const first = ms[0].year
    const span = Math.max(1, ms[ms.length - 1].year - first)
    return ms.map((m, i) => 0.06 + 0.88 * (0.65 * ((m.year - first) / span) + 0.35 * (i / Math.max(1, ms.length - 1))))
  }, [ms])

  const onKey = (e: KeyboardEvent, i: number) => {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!move) return
    e.preventDefault()
    pins.current[(i + move + ms.length) % ms.length]?.focus()
  }

  const m = open !== null ? ms[open] : null

  const body = (
    <>
      <div className="timeline-scroll hide-narrow">
        <div className="timeline" role="group" aria-label={`${artist.name} career milestones`}>
          <div className="timeline-axis" aria-hidden="true" />
          {ms.map((mm, i) => (
            <button
              key={i}
              ref={(el) => { pins.current[i] = el }}
              className={`tl-pin ${mm.kind === 'this-tour' ? 'now' : ''}`}
              style={{ left: `${positions[i] * 100}%` }}
              aria-expanded={open === i}
              aria-controls={`story-card-${artist.id}`}
              onClick={() => setOpen(open === i ? null : i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <b>{mm.year}</b>
              <span className="tl-dot" aria-hidden="true" />
              <span className="tl-title">{mm.title}</span>
            </button>
          ))}
        </div>
      </div>

      <ol className="story-list show-narrow">
        {ms.map((mm, i) => (
          <li key={i}>
            <b>{mm.year} · {mm.title}</b>
            <div className="tiny muted">{kindLabel[mm.kind]}</div>
            <p className="small">{mm.story}</p>
          </li>
        ))}
      </ol>

      {m && (
        <div className="story-card hide-narrow" id={`story-card-${artist.id}`} aria-live="polite">
          <div className="row between">
            <span className="chip">{kindLabel[m.kind]}</span>
            <span className="muted small">{m.year}</span>
          </div>
          <h3 style={{ margin: '10px 0 6px' }}>{m.title}</h3>
          <p>{m.story}</p>
          <div className="row" style={{ marginTop: 12 }}>
            {m.clipUrl ? (
              <button className="btn btn-primary btn-sm" onClick={() => playClip(m.clipUrl!, `${m.title} (snippet)`)}>
                <Icon name="play" size={14} /> Play a snippet on the record player
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={openSpotify}>
                <Icon name="music" size={16} /> Listen on Spotify
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )

  if (compact) return <div className="story compact stack-sm"><p className="muted small">From the first song to this tour. Pick a year to read the story.</p>{body}</div>

  return (
    <section className="card story" aria-labelledby={`story-${artist.id}`}>
      <div className="stack-sm">
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={`story-${artist.id}`} style={{ fontSize: 24 }}>The {artist.name} story</h2>
        <p className="muted small">From the first song to this tour. Pick a year to read the story.</p>
      </div>
      {body}
    </section>
  )
}

// Three-card teaser used on the tour page.
export function StoryPreview({ artist, onExplore }: { artist: Artist; onExplore?: () => void }) {
  return (
    <section className="stack" aria-labelledby="story-preview">
      <div className="row between">
        <h2 id="story-preview" style={{ fontSize: 24 }}>The {artist.name} story</h2>
        {onExplore && <button className="link-btn" onClick={onExplore}>Explore the story →</button>}
      </div>
      <div className="story-strip">
        {artist.milestones.slice(0, 3).map((m) => (
          <article key={m.title} className="card card-tight surface stack-sm">
            <span className="chip" style={{ alignSelf: 'flex-start' }}>{kindLabel[m.kind]} · {m.year}</span>
            <strong>{m.title}</strong>
            <p className="small muted">{m.story}</p>
          </article>
        ))}
      </div>
      {/* The soundtrack hint lives here, inline, instead of as a tooltip over the page (T1). */}
      <p className="small muted"><Icon name="music" size={16} /> Want a soundtrack while you wait? Tap the record in the bottom corner. It never plays on its own.</p>
    </section>
  )
}
