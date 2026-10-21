import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { href, navigate, useRoute } from '../router'
import { HOLD_SECONDS, holdSecondsLeft, showPath } from '../sale'
import { BOOKING_FEE, bestAdjacent, money, seatLabel, simulatedTaken, takenSeats } from '../seats'
import { overBudget } from '../plan'
import { useRecordPlayerHost } from '../audio'
import { leaveQueue, peekQueue } from '../queue/simulator'
import type { Section, Show } from '../types'
import ArenaMap, { SeatGrid, type BlockInfo } from '../components/ArenaMap'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { formatCountdown } from '../components/Countdown'
import { LoginGate, ShowHeader, useDocumentTitle } from './shared'
import NotFound from './NotFound'

// The seat hold is the most urgent fact here, so it sits with the Pay button (D5).
function HoldTimer({ seconds }: { seconds: number }) {
  const low = seconds <= 120
  return (
    <div className={`hold-timer ${low ? 'low' : ''}`}>
      <Icon name="clock" size={20} />
      <div>
        <span className="small">Seats held for</span>
        <b className="num" role="timer" aria-label={`${Math.ceil(seconds / 60)} minutes left to check out`}>{formatCountdown(seconds * 1000)}</b>
      </div>
      <div className="hold-bar" aria-hidden="true"><span style={{ width: `${(seconds / HOLD_SECONDS) * 100}%` }} /></div>
      <span className="visually-hidden" aria-live="assertive">{seconds === 60 ? 'One minute left to check out.' : ''}</span>
    </div>
  )
}

function Checkout({ show }: { show: Show }) {
  const store = useStore()
  const route = useRoute()
  const arena = store.arenaOf(show)
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const plan = store.planFor(show.id)
  const queue = peekQueue(show.id)?.getState()
  const queued = show.hasQueue

  useDocumentTitle('Your turn')
  useRecordPlayerHost(artist.id, 'focus')

  // Why each section can't be bought, in the fan's terms: "Sold out" is not the same as "can't seat 2 together" (D6).
  const lost = new Map(queue?.sections.filter((s) => s.status === 'sold-out' || s.status === 'cant-seat-together').map((s) => [s.sectionId, s.status]))
  const [quantity, setQuantity] = useState(plan?.quantity ?? 2)
  const [changingQty, setChangingQty] = useState(!plan)
  const firstChoice = route.query.get('section') ?? plan?.rankedSectionIds.find((id) => !lost.has(id)) ?? null
  const [sectionId, setSectionId] = useState<string | null>(firstChoice)
  const section = arena.sections.find((s) => s.id === sectionId) ?? null
  const inPlan = (s: Section) => !plan || plan.rankedSectionIds.includes(s.id)

  const taken = useMemo(() => {
    if (!section) return new Set<string>()
    const sim = simulatedTaken(show.id, section, queued ? 0.6 : 0.3)
    takenSeats(store.bookings, show.id).forEach((id) => sim.add(id))
    return sim
  }, [section, show.id, queued, store.bookings])

  const [selected, setSelected] = useState<string[]>([])
  // Pre-pick the best seats together that match the plan, so the user only has to confirm.
  useEffect(() => {
    if (!section) return setSelected([])
    if (section.kind === 'standing') return setSelected(Array.from({ length: quantity }, (_, i) => `${section.id}:GA${i + 1}`))
    setSelected(bestAdjacent(section, taken, quantity))
  }, [section, taken, quantity])

  // Queued fans' hold started when their turn came up; walk-up buyers' starts when they open this page.
  const [openedAt] = useState(() => Date.now())
  const secondsLeft = holdSecondsLeft(queue?.turnAt ?? openedAt, store.now)
  const expired = secondsLeft === 0
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.classList.add('checkout-on')
    return () => document.body.classList.remove('checkout-on')
  }, [])

  const blocked = queued && queue?.phase !== 'your-turn'
  if (blocked) {
    return (
      <div className="container page narrow">
        <div className="empty stack" style={{ alignItems: 'center' }}>
          <h1 style={{ fontSize: 28 }}>This show sells through the queue</h1>
          <p className="muted">Join the queue and we'll bring you here when it's your turn.</p>
          <a className="btn btn-primary" href={href(showPath(show, 'queue'))}>Go to the queue</a>
        </div>
      </div>
    )
  }

  const info = (s: Section): BlockInfo => {
    const why = lost.get(s.id)
    if (why === 'sold-out') return { kind: 'sold-out', note: 'Sold out' }
    if (why === 'cant-seat-together') return { kind: 'cant-seat', note: `Can't seat ${quantity} together` }
    if (plan && overBudget(plan, s.price)) return { kind: 'over-budget', note: `Over ${money(plan.maxPricePerTicket)}` }
    if (!inPlan(s)) return { kind: 'outside', note: 'Not in your plan' }
    return { kind: 'available' }
  }

  const toggleSeat = (id: string) => {
    setError('')
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= quantity ? [...prev.slice(1), id] : [...prev, id]))
  }

  const ticketPrice = section?.price ?? 0
  const subtotal = ticketPrice * selected.length
  const fees = BOOKING_FEE * selected.length
  const total = subtotal + fees
  const ready = section && selected.length === quantity

  const pay = () => {
    if (!section) return
    const booking = store.book({ showId: show.id, sectionId: section.id, seats: selected, total })
    if (!booking) {
      setError('Sorry, one of those seats was just taken. We\'ve picked the next best seats for you.')
      setSelected(bestAdjacent(section, new Set([...taken, ...selected]), quantity))
      return
    }
    leaveQueue(show.id)
    navigate(`${showPath(show, 'outcome')}?b=${booking.id}`)
  }

  const payButton = (
    <button className="btn btn-primary btn-lg btn-block" disabled={!ready || expired} onClick={pay}>Pay {money(total)}</button>
  )

  return (
    <div className="container page stack-lg">
      <ShowHeader show={show} />

      <div className="stack-sm">
        <h1 style={{ fontSize: 32 }}>{queued ? 'It\'s your turn' : 'Pick your seats'}</h1>
        <p className="muted">
          {section
            ? <>We've picked the best {quantity === 1 ? 'seat' : `${quantity} seats together`} in <b>{section.name}</b>{queued && inPlan(section) ? ', your plan\'s best option still available' : ''}. Tap other seats to change them.</>
            : 'Choose a section on the map to see seats.'}
        </p>
      </div>

      <div className="seats-layout">
        <div className="stack-lg">
          <ArenaMap
            arena={arena}
            label="Sections"
            rankedIds={plan?.rankedSectionIds ?? []}
            activeId={sectionId ?? undefined}
            info={info}
            onSelect={(s) => setSectionId(s.id)}
          />
          {section && !inPlan(section) && (
            <p className="note-warn small" role="status"><Icon name="info" size={16} /> {section.name} isn't one of your ranked sections. You can still buy here if it suits you.</p>
          )}
          {section && section.kind === 'seated' && (
            <section className="card stack" aria-labelledby="seat-h">
              <div className="row between">
                <h2 id="seat-h" style={{ fontSize: 20 }}>{section.name}: seats</h2>
                <span className="small muted">Row A is closest to the stage</span>
              </div>
              {selected.length > 0 && (
                <p className="small"><b>Your seats:</b> {selected.map((id) => seatLabel(arena, id).split(' · ').slice(1).join(' ')).join('; ')}</p>
              )}
              <SeatGrid section={section} taken={taken} selected={selected} onToggle={toggleSeat} />
              <ul className="legend" aria-hidden="true">
                <li><i /> Available</li>
                <li><i className="l-picked" /> Your seats</li>
                <li><i className="l-sold-out" /> Taken</li>
              </ul>
            </section>
          )}
          {section && section.kind === 'standing' && (
            <div className="card surface row">
              <Icon name="standing" size={28} />
              <span><b>{section.name} is general admission standing.</b> No seat numbers: your tickets get you in to the {section.name} area.</span>
            </div>
          )}
        </div>

        <aside className="card stack" aria-labelledby="summary-h">
          <h2 id="summary-h" style={{ fontSize: 20 }}>Order summary</h2>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small">Tickets</span>
            {changingQty ? (
              <div className="row" style={{ gap: 8 }}>
                <button className="icon-btn stepper" aria-label="One fewer ticket" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
                <output className="num" aria-live="polite"><b>{quantity}</b></output>
                <button className="icon-btn stepper" aria-label="One more ticket" disabled={quantity >= 8} onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            ) : (
              <span className="small"><b>{quantity}</b> from your plan · <button className="link-btn" onClick={() => setChangingQty(true)}>Change</button></span>
            )}
          </div>
          {selected.length ? (
            <ul className="stack-sm small" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {selected.map((id) => <li key={id} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><Icon name="ticket" size={16} /> {seatLabel(arena, id)}</li>)}
            </ul>
          ) : (
            <p className="small muted">No seats selected.</p>
          )}
          {selected.length > 0 && selected.length < quantity && <p className="small" style={{ color: 'var(--warning-ink)' }}>Pick {quantity - selected.length} more {quantity - selected.length === 1 ? 'seat' : 'seats'}.</p>}
          <div className="stack-sm">
            <div className="summary-line"><span>{selected.length} × {money(ticketPrice)}</span><span>{money(subtotal)}</span></div>
            <div className="summary-line muted"><span>Booking fee ({money(BOOKING_FEE)} each)</span><span>{money(fees)}</span></div>
            <div className="summary-line summary-total"><span>Total</span><span>{money(total)}</span></div>
          </div>
          <p className="tiny muted">The price you see is the price you pay. No surprise fees at the end.</p>
          <div className="row small muted"><Icon name="card" size={18} /> {store.user?.paymentSaved ? 'Saved card •••• 4242' : 'Demo card •••• 4242 (no real payment)'}</div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <HoldTimer seconds={secondsLeft} />
          {payButton}
        </aside>
      </div>

      {/* Phones: the timer and Pay stay in reach while the map and seats scroll. */}
      <div className="checkout-bar" aria-hidden="true">
        <span className={`num ${secondsLeft <= 120 ? 'low' : ''}`}><Icon name="clock" size={16} /> {formatCountdown(secondsLeft * 1000)}</span>
        <button className="btn btn-primary" tabIndex={-1} disabled={!ready || expired} onClick={pay}>Pay {money(total)}</button>
      </div>

      {expired && (
        <Modal title="Time's up">
          <div className="stack" style={{ marginTop: 8 }}>
            <p>We held your seats for 8 minutes, and they've now been released to the next person.</p>
            <a className="btn btn-primary" href={href(`/tour/${tour.id}`)} onClick={() => leaveQueue(show.id)}>Back to the tour</a>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function SeatsPage({ showId }: { showId: string }) {
  const { findShow } = useStore()
  const show = findShow(showId)
  if (!show) return <NotFound />
  return (
    <LoginGate reason="Log in to buy tickets.">
      <Checkout show={show} />
    </LoginGate>
  )
}
