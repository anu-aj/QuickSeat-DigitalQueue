import { FRONT, isGone, type QueueState, type SectionState } from '../queue/simulator'
import { formatNumber, money } from '../seats'
import { SectionBadge } from './StatusBadge'
import QueueTrack from './QueueTrack'

const pct = (x: number) => `${(x * 100).toFixed(2)}%`

// What each bar means, said in words (Q4): the colour and the legend never need decoding.
function meaning(s: SectionState) {
  if (s.skipped || isGone(s)) return { cls: 'gone', text: 'No longer possible' }
  if (s.status === 'likely') return { cls: 'last', text: 'Should last past you' }
  if (s.status === 'at-risk') return { cls: 'close', text: 'Close call: may run out around your turn' }
  return { cls: 'before', text: 'Likely to run out before you' }
}

function statusText(s: SectionState, q: number) {
  if (s.skipped) return 'Skipped'
  if (s.status === 'sold-out') return 'Sold out'
  if (s.status === 'cant-seat-together') return `Can't seat ${q} together`
  return s.status === 'likely' ? 'Likely' : s.status === 'at-risk' ? 'At risk' : 'Unlikely'
}

// The one progress visual on the queue page: where you are now, and where each ranked section is expected to run out.
export default function QueueChart({ state, bestId }: { state: QueueState; bestId?: string }) {
  const you = Math.min(FRONT, state.progress * FRONT)
  const q = state.plan.quantity

  return (
    <section id="queue-sections" className="card stack" aria-labelledby="qchart-h">
      <div className="stack-sm">
        <h2 id="qchart-h" style={{ fontSize: 20 }}>Your sections along the queue</h2>
        <ul className="qchart-legend" aria-hidden="true">
          <li><i className="qchart-est last" /> Should last past you</li>
          <li><i className="qchart-est close" /> Close call</li>
          <li><i className="qchart-est before" /> Runs out before you</li>
          <li><i className="qchart-est gone" /> Gone</li>
        </ul>
      </div>

      {/* Your note hops along the top edge on the chart's own scale: it reaches the front line exactly when you do. */}
      <div className="qchart-staffrow" aria-hidden="true">
        <span className="tiny muted">Your place</span>
        <div style={{ width: pct(FRONT) }}><QueueTrack progress={state.progress} bare /></div>
      </div>

      <div className="qchart" aria-hidden="true">
        <div>
          {state.sections.map((s, i) => {
            const dim = isGone(s) || s.skipped
            const best = s.sectionId === bestId
            return (
              <div className={`qchart-label ${best ? 'best' : ''}`} key={s.sectionId}>
                <span className={`rank-num ${dim || i < state.activeIndex ? 'off' : ''}`}>{i + 1}</span>
                <span className={`qchart-text ${dim ? 'muted' : ''}`}>
                  <span><b>{s.name}</b> <span className="muted">{money(s.price)}</span></span>
                  <span className="qchart-meta">
                    {s.skipped ? <span className="badge badge-off">Skipped</span> : <SectionBadge status={s.status} quantity={q} />}
                    {!dim && <span className="tiny muted num">{formatNumber(s.remaining)} left</span>}
                  </span>
                  {best && <span className="tiny qchart-best">Your best chance</span>}
                </span>
              </div>
            )
          })}
        </div>
        <div className="qchart-plot">
          <div className="qchart-after" style={{ left: pct(FRONT) }}><span>After your turn</span></div>
          {state.sections.map((s) => {
            const left = Math.max(0, s.estimate.at - s.estimate.width / 2)
            return (
              <div className="qchart-track" key={s.sectionId}>
                <div className={`qchart-est ${meaning(s).cls}`} style={{ left: pct(left), width: pct(Math.min(s.estimate.width, 1 - left)) }} />
              </div>
            )
          })}
          <div className="qchart-front" style={{ left: pct(FRONT) }} />
          <div className="qchart-line" style={{ left: pct(you) }} />
        </div>
        <div />
        <div className="qchart-axis">
          <span>Where you joined</span>
          <span className="qchart-axis-front" style={{ left: pct(FRONT) }}>Front of queue</span>
        </div>
      </div>

      {/* Hidden via a wrapper: a table ignores width: 1px and would widen the page on phones. */}
      <div className="visually-hidden">
      <table>
        <caption>Your ranked sections: status, tickets left and whether each should last until your turn</caption>
        <thead><tr><th>Choice</th><th>Section</th><th>Status</th><th>Tickets left</th><th>Outlook</th></tr></thead>
        <tbody>
          {state.sections.map((s, i) => (
            <tr key={s.sectionId}><td>{i + 1}</td><td>{s.name}</td><td>{statusText(s, q)}</td><td>{isGone(s) ? 0 : formatNumber(s.remaining)}</td><td>{meaning(s).text}</td></tr>
          ))}
        </tbody>
      </table>
      </div>

      <p className="small muted">
        Bars show where each section is expected to run out, based on how fast it's selling. If a section in your plan sells out,
        we'll {state.plan.rule === 'ask-me' ? 'ask you first' : 'move you to your next choice and tell you'}.
      </p>
    </section>
  )
}
