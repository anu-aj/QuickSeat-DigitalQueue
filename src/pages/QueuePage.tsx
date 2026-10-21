import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from '../store'
import { href, isDemo, navigate } from '../router'
import { holdSecondsLeft, showPath } from '../sale'
import { formatNumber, money } from '../seats'
import { planPill, rankedSections } from '../plan'
import { notify, useRecordPlayerHost } from '../audio'
import { setArtistOverride } from '../theme'
import { createQueue, getQueue, leaveQueue, peekQueue, summarise, type QueueAlert, type QueueState, type QueueStore, type SectionState, type Storyline } from '../queue/simulator'
import type { Show, TicketPlan } from '../types'
import QueueChart from '../components/QueueChart'
import { SectionBadge } from '../components/StatusBadge'
import StoryTimeline from '../components/StoryTimeline'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import Countdown, { formatCountdown } from '../components/Countdown'
import { AlertsControl, LoginGate, ShowHeader, useDocumentTitle } from './shared'
import NotFound from './NotFound'

function AlertBox({ alert, sticky }: { alert: QueueAlert; sticky?: boolean }) {
  const cls = alert.tone === 'info' ? 'alert-info' : alert.tone === 'good' ? 'alert-good' : ''
  return (
    <div className={`alert ${cls} ${sticky && alert.tone !== 'info' ? 'sticky-alert' : ''}`} role={alert.important ? 'alert' : 'status'}>
      <Icon name={alert.tone === 'info' ? 'info' : alert.tone === 'good' ? 'check' : 'alert'} />
      <div>
        <strong>{alert.title}</strong>
        <span className="small">{alert.body}</span>
      </div>
    </div>
  )
}

const chanceRank = { likely: 0, 'at-risk': 1, unlikely: 2, 'sold-out': 3, 'cant-seat-together': 3 } as const

function OptionCard({ section, rank, quantity, tag, primary, label, onPick }: {
  section: SectionState; rank: number; quantity: number; tag: string; primary: boolean; label: string; onPick: () => void
}) {
  return (
    <div className={`decide-option ${primary ? 'recommended' : ''}`}>
      <span className="eyebrow">{tag}</span>
      <strong style={{ fontSize: 18 }}>{section.name}</strong>
      <span className="small muted">Choice {rank} · {money(section.price)} each</span>
      <div className="row" style={{ gap: 8 }}>
        <SectionBadge status={section.status} quantity={quantity} />
        <span className="small muted num">{formatNumber(section.remaining)} left</span>
      </div>
      <button className={`btn ${primary ? 'btn-primary' : 'btn-secondary'} btn-block`} data-autofocus={primary || undefined} onClick={onPick}>{label}</button>
    </div>
  )
}

// "Ask me first": both options side by side with their chances, and leaving kept apart behind a confirm (D1, D2).
function DecisionModal({ queue }: { queue: QueueStore }) {
  const state = queue.getState()
  const d = state.decision!
  const [leaving, setLeaving] = useState(false)
  const next = state.sections[d.nextIndex]
  const after = state.sections[d.nextIndex + 1]
  const afterSafer = !!after && chanceRank[after.status] < chanceRank[next.status]
  const q = state.plan.quantity

  return (
    <Modal title={d.reason} wide>
      <div className="stack" style={{ marginTop: 8 }}>
        <p>You asked us to check with you first. Choose what to aim for now. Your place in the queue is kept either way.</p>
        <div className="decide-grid">
          <OptionCard
            section={next} rank={d.nextIndex + 1} quantity={q} primary={!afterSafer}
            tag={afterSafer ? 'Your next choice' : 'Your next choice · best chance'}
            label={`Continue with ${next.name}`} onPick={() => queue.respond('continue')}
          />
          {after && (
            <OptionCard
              section={after} rank={d.nextIndex + 2} quantity={q} primary={afterSafer}
              tag={afterSafer ? 'Safer pick' : 'Skip ahead'}
              label={`Skip to ${after.name}`} onPick={() => queue.respond('skip')}
            />
          )}
        </div>
        <p className="small muted">
          If you don't choose within <Countdown to={new Date(d.deadline).toISOString()} />, we'll continue with {next.name}.
        </p>
        <div className="decide-leave">
          {leaving ? (
            <div className="row" role="group" aria-label="Confirm leaving the queue">
              <span className="small">You'll lose your place and can't get it back.</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setLeaving(false)}>Stay in the queue</button>
              <button className="btn btn-danger btn-sm" onClick={() => queue.respond('leave')}>Yes, leave</button>
            </div>
          ) : (
            <button className="link-btn small" onClick={() => setLeaving(true)}>I don't want any of these: leave the queue</button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function DemoPanel({ queue, onRestart }: { queue: QueueStore; onRestart: (s: Storyline) => void }) {
  const state = queue.getState()
  return (
    <details className="demo-panel" aria-label="Demo controls">
      <summary>Demo controls</summary>
      <div className="row" style={{ gap: 6 }}>
        {[1, 10, 50].map((s) => (
          <button key={s} aria-pressed={state.speed === s} onClick={() => queue.setSpeed(s)}>×{s}</button>
        ))}
      </div>
      <button onClick={() => queue.jumpToNextEvent()}>Jump to next event</button>
      <button onClick={() => onRestart(state.storyline === 'sold-out' ? 'default' : 'sold-out')}>
        Restart with {state.storyline === 'sold-out' ? 'default' : 'sold-out'} storyline
      </button>
    </details>
  )
}

function HoldPill({ seconds }: { seconds: number }) {
  return (
    <span className={`badge hold-pill ${seconds <= 120 ? 'badge-warn' : 'badge-good'}`} role="timer">
      <Icon name="clock" /> Seats held for <span className="num">{formatCountdown(seconds * 1000)}</span>
    </span>
  )
}

// One line that keeps your place in view once the big counter scrolls away (P5).
function FloatingTracker({ state, holdSeconds, onSeats }: { state: QueueState; holdSeconds: number; onSeats: () => void }) {
  const summary = summarise(state)
  const yourTurn = state.phase === 'your-turn'
  return (
    <aside className="qfloat" aria-label="Your place in the queue">
      {yourTurn ? (
        <>
          <b>It's your turn</b>
          <HoldPill seconds={holdSeconds} />
          <button className="btn btn-primary btn-sm" onClick={onSeats}>Pick seats</button>
        </>
      ) : (
        <>
          <span className="qfloat-count"><b className="num">{formatNumber(state.peopleAhead)}</b> ahead</span>
          {summary.best && <span className="qfloat-best small"><b>{summary.best.name}</b> <SectionBadge status={summary.status} quantity={state.plan.quantity} /></span>}
          <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Back to the top of the queue page" onClick={() => window.scrollTo({ top: 0 })}>
            <Icon name="up" size={18} />
          </button>
        </>
      )}
    </aside>
  )
}

function Freshness({ state, now }: { state: QueueState; now: number }) {
  if (state.phase === 'decision') return <span className="small muted"><Icon name="clock" size={14} /> Paused while you decide</span>
  const ago = Math.max(0, Math.round((now - state.updatedAt) / 1000))
  const stale = ago > 10
  return (
    <span className={`small fresh ${stale ? 'stale' : 'muted'}`} aria-live={stale ? 'polite' : 'off'}>
      <span className="fresh-dot" aria-hidden="true" />
      {stale ? `No update for ${ago}s. Checking the connection…` : ago <= 2 ? 'Updated just now' : `Updated ${ago}s ago`}
    </span>
  )
}

function LiveQueue({ show, plan }: { show: Show; plan: TicketPlan }) {
  const store = useStore()
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const [version, setVersion] = useState(0)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const demo = isDemo()

  const queue = getQueue(show.id, () => createQueue({ plan, sections: arena.sections, showId: show.id, speed: demo ? 10 : 1 }))
  const state = useSyncExternalStore(queue.subscribe, queue.getState)
  const summary = summarise(state)
  const latest = state.alerts[0]
  const yourTurn = state.phase === 'your-turn'
  const holdSeconds = state.turnAt ? holdSecondsLeft(state.turnAt, store.now) : 0

  useRecordPlayerHost(artist.id, yourTurn ? 'focus' : 'show')
  useEffect(() => {
    setArtistOverride(artist.id)
    return () => setArtistOverride(null)
  }, [artist.id])

  // Chime + browser notification for anything that changes the plan.
  const lastAlert = useRef(latest?.id)
  useEffect(() => {
    if (!latest || latest.id === lastAlert.current) return
    lastAlert.current = latest.id
    if (latest.tone !== 'info' || latest.important) notify(latest.title, latest.body)
  }, [latest])

  // Tab title: progress while waiting, a flag when something needs you.
  useEffect(() => {
    const flag = yourTurn ? '🎟 Your turn!' : state.phase === 'decision' ? '⚠ Plan changed' : null
    document.title = flag ?? `(${formatNumber(state.peopleAhead)} ahead) QuickSeat`
  }, [yourTurn, state.phase, state.peopleAhead])
  useEffect(() => () => { document.title = 'QuickSeat' }, [])

  useEffect(() => {
    if (state.outcome === 'sold-out') {
      const t = setTimeout(() => navigate(`${showPath(show, 'outcome')}?r=sold-out`), 2500)
      return () => clearTimeout(t)
    }
    if (state.outcome === 'left') {
      leaveQueue(show.id)
      navigate(`/tour/${tour.id}`)
      // After the route change, so the confirmation shows on the tour page rather than being suppressed here.
      setTimeout(() => store.toast('You left the queue.'), 100)
    }
  }, [state.outcome]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = (storyline: Storyline) => {
    leaveQueue(show.id)
    getQueue(show.id, () => createQueue({ plan, sections: arena.sections, showId: show.id, storyline, speed: state.speed }))
    setVersion(version + 1)
  }

  const active = state.sections[state.activeIndex]
  const goToSeats = () => active && navigate(`${showPath(show, 'seats')}?section=${active.sectionId}`)

  // Show the floating tracker only while the main counter is out of view.
  const counterRef = useRef<HTMLElement>(null)
  const [counterVisible, setCounterVisible] = useState(true)
  useEffect(() => {
    const el = counterRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setCounterVisible(e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [state.phase === 'assigned', version]) // eslint-disable-line react-hooks/exhaustive-deps
  const floating = !counterVisible && state.phase !== 'assigned' && state.phase !== 'done'
  useEffect(() => {
    document.body.classList.toggle('qfloat-on', floating)
    return () => document.body.classList.remove('qfloat-on')
  }, [floating])

  const sectionNames = rankedSections(plan, arena.sections).map((s) => s.name).join(' → ')
  const leaveLink = <button className="link-btn small" onClick={() => setConfirmLeave(true)}>Leave queue</button>

  return (
    <div className="container page narrow stack-lg" key={version}>
      <ShowHeader
        show={show}
        right={<span className="plan-pill">Your plan: <b>{planPill(plan)}</b><br /><span className="small">{sectionNames}</span></span>}
      />

      {state.phase === 'assigned' ? (
        <section className="card stack queue-assigned" aria-live="polite">
          <Icon name="shield" size={40} />
          <h1 style={{ fontSize: 28 }}>You're in the queue</h1>
          <p className="muted">Your place is random and fair. Refreshing won't change it.</p>
        </section>
      ) : yourTurn ? (
        // D3, D4: the risk is resolved, so the status is the hold timer, and "It's your turn" is said once.
        <section className="stack" aria-labelledby="q-h" ref={counterRef}>
          <h1 id="q-h" style={{ fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 600 }}>It's your turn</h1>
          <div className="row"><HoldPill seconds={holdSeconds} /></div>
          {active && <p className="muted">We're holding seats that fit your plan in <b>{active.name}</b>, your choice {state.activeIndex + 1}, at {money(active.price)} each.</p>}
          {active && (
            <div className="row">
              <button className="btn btn-primary btn-lg" data-autofocus onClick={goToSeats}>
                Pick your seats <Icon name="arrowRight" size={18} />
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="stack" aria-labelledby="q-h" ref={counterRef}>
          <h1 id="q-h" className="row" style={{ alignItems: 'baseline', gap: 12 }}>
            <span className="big-count">{formatNumber(state.peopleAhead)}</span>
            <span style={{ fontSize: 18, fontWeight: 400 }} className="muted">people ahead of you</span>
          </h1>
          <div className="row queue-meta">
            <Freshness state={state} now={store.now} />
            {leaveLink}
          </div>
          {summary.best ? (
            <div className="best-chance">
              <div className="row" style={{ gap: 10 }}>
                <span className="small muted">Your best chance:</span>
                <strong style={{ fontSize: 20 }}>{summary.best.name}</strong>
                <span className="small muted">choice {summary.rank}</span>
                <SectionBadge status={summary.status} quantity={plan.quantity} />
              </div>
              <p className="small">{summary.sentence}</p>
            </div>
          ) : (
            <div className="best-chance"><p>{summary.sentence}</p></div>
          )}
        </section>
      )}

      {!yourTurn && <AlertsControl />}

      {floating && <FloatingTracker state={state} holdSeconds={holdSeconds} onSeats={goToSeats} />}

      {/* Banner = what changed; the headline above = where you stand now (Q7). */}
      {!yourTurn && state.phase !== 'assigned' && latest && <AlertBox alert={latest} sticky />}
      {!yourTurn && state.alerts.length > 1 && (
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>Earlier updates ({state.alerts.length - 1})</summary>
          <div className="stack-sm" style={{ marginTop: 12 }}>
            {state.alerts.slice(1).map((a) => <AlertBox key={a.id} alert={a} />)}
          </div>
        </details>
      )}

      {!yourTurn && state.phase !== 'assigned' && <QueueChart state={state} bestId={summary.best?.sectionId} />}

      {!yourTurn && (
        <p className="small muted look-away"><Icon name="eyeOff" size={16} /> You can look away. Your place is kept, and we'll alert you if your plan changes.</p>
      )}
      {yourTurn && <div>{leaveLink}</div>}

      {/* Engagement lives below the queue, collapsed, so it never outweighs the task (J7, Q8). */}
      {!yourTurn && (
        <details className="aside-details">
          <summary><Icon name="music" size={16} /> While you wait: the {artist.name} story</summary>
          <StoryTimeline artist={artist} compact />
        </details>
      )}

      {state.phase === 'decision' && state.decision && <DecisionModal queue={queue} />}
      {confirmLeave && (
        <Modal title="Leave the queue?" onClose={() => setConfirmLeave(false)}>
          <div className="stack" style={{ marginTop: 8 }}>
            <p>You'll lose your place. If you join again you'll get a new random place at the back.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" data-autofocus onClick={() => setConfirmLeave(false)}>Stay in queue</button>
              <button className="btn btn-danger" onClick={() => { setConfirmLeave(false); queue.respond('leave') }}>Leave queue</button>
            </div>
          </div>
        </Modal>
      )}
      {demo && <DemoPanel queue={queue} onRestart={restart} />}
    </div>
  )
}

function QueueGate({ showId }: { showId: string }) {
  const store = useStore()
  const show = store.findShow(showId)!
  const status = store.statusOf(show)
  const plan = store.planFor(show.id)
  useDocumentTitle('Queue')
  const tooEarly = status === 'waiting-room' && !peekQueue(show.id)
  useEffect(() => {
    if (tooEarly) navigate(showPath(show, 'waiting'), { keepQuery: true })
  }, [tooEarly, show])
  // Arriving without a plan (e.g. straight after logging in at the gate) opens the plan sheet, then returns here.
  useEffect(() => {
    if (!plan) navigate(`/tour/${show.tourId}?plan=${show.id}&then=queue`)
  }, [plan, show])

  if (!plan) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>Set your plan to join the queue</h1>
          <p className="muted">Choose your sections now so the queue can track them for you.</p>
          <a className="btn btn-primary" href={href(`/tour/${show.tourId}?plan=${show.id}&then=queue`)}>Set my plan</a>
        </div>
      </div>
    )
  }
  if (tooEarly) return null
  if (status !== 'queue-open' && !peekQueue(show.id)) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>This queue isn't open</h1>
          <p className="muted">Check the tour page for when tickets go on sale.</p>
          <a className="btn btn-primary" href={href(`/tour/${show.tourId}`)}>Back to the tour</a>
        </div>
      </div>
    )
  }
  return <LiveQueue show={show} plan={plan} />
}

export default function QueuePage({ showId }: { showId: string }) {
  const { findShow } = useStore()
  if (!findShow(showId)) return <NotFound />
  return (
    <LoginGate reason="Log in to join the queue. Your plan is saved to your account.">
      <QueueGate showId={showId} />
    </LoginGate>
  )
}
