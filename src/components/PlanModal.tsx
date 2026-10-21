import { useState } from 'react'
import type { Section, Show, TicketPlan } from '../types'
import { useStore } from '../store'
import { BOOKING_FEE, formatShowDate, money, priceRange } from '../seats'
import { NO_LIMIT, budgetText, overBudget, rankedSections, ruleText, ticketsText } from '../plan'
import ArenaMap, { type BlockInfo } from './ArenaMap'
import Modal from './Modal'
import Icon from './Icon'

interface Props {
  show: Show
  // Where saving leads next, so the last button can say so ("Save and join queue").
  then?: 'waiting' | 'queue' | null
  onClose: () => void
  onSaved: (plan: TicketPlan) => void
}

const STEPS = ['Tickets and budget', 'Sections', 'Review'] as const

// The heart of the Preparation stage, in three short steps so nothing important sits below the fold.
export default function PlanModal({ show, then, onClose, onSaved }: Props) {
  const store = useStore()
  const arena = store.arenaOf(show)
  const [lo, hi] = priceRange(arena)
  const existing = store.planFor(show.id)
  const [plan, setPlan] = useState<TicketPlan>(
    existing ?? { showId: show.id, quantity: 2, maxPricePerTicket: NO_LIMIT, rankedSectionIds: [], rule: 'ask-me' },
  )
  const [step, setStep] = useState(0)
  const [dropped, setDropped] = useState<string[]>([])

  const ranked = rankedSections(plan, arena.sections)
  const fits = arena.sections.filter((s) => !overBudget(plan, s.price)).length

  const toggle = (s: Section) => {
    const ids = plan.rankedSectionIds
    if (ids.includes(s.id)) setPlan({ ...plan, rankedSectionIds: ids.filter((x) => x !== s.id) })
    else if (ids.length < 3) setPlan({ ...plan, rankedSectionIds: [...ids, s.id] })
    else setPlan({ ...plan, rankedSectionIds: [...ids.slice(0, 2), s.id] }) // swap in as choice 3
  }

  const setBudget = (max: number) => {
    const keep = plan.rankedSectionIds.filter((id) => !overBudget({ maxPricePerTicket: max }, arena.sections.find((s) => s.id === id)?.price ?? 0))
    setDropped(plan.rankedSectionIds.filter((id) => !keep.includes(id)).map((id) => arena.sections.find((s) => s.id === id)?.name ?? id))
    setPlan({ ...plan, maxPricePerTicket: max, rankedSectionIds: keep })
  }

  const info = (s: Section): BlockInfo => {
    if (overBudget(plan, s.price)) return { kind: 'over-budget', note: `Over ${money(plan.maxPricePerTicket)}` }
    if (!plan.rankedSectionIds.includes(s.id) && plan.rankedSectionIds.length >= 3) return { kind: 'swap', note: 'Tap to swap in as #3' }
    return { kind: 'available' }
  }

  const save = () => {
    store.savePlan(plan)
    onSaved(plan)
  }
  const saveLabel = then === 'queue' ? 'Save and join the queue' : then === 'waiting' ? 'Save and enter the waiting room' : 'Save my plan'

  return (
    <Modal title="Set your ticket plan" onClose={onClose} wide>
      <div className="stack" style={{ marginTop: 4 }}>
        <p className="muted small">{arena.name}, {arena.city} · {formatShowDate(show.date, arena.timeZone)}</p>
        <ol className="steps-bar" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="step-n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span> {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="stack">
            <fieldset className="stack-sm plain-fieldset">
              <legend className="field" style={{ marginBottom: 6 }}>How many seats together?</legend>
              <div className="row">
                <button className="icon-btn stepper" aria-label="One fewer ticket" disabled={plan.quantity <= 1} onClick={() => setPlan({ ...plan, quantity: plan.quantity - 1 })}>−</button>
                <output className="num" style={{ fontSize: 24, fontWeight: 700, minWidth: 32, textAlign: 'center' }} aria-live="polite">{plan.quantity}</output>
                <button className="icon-btn stepper" aria-label="One more ticket" disabled={plan.quantity >= 8} onClick={() => setPlan({ ...plan, quantity: plan.quantity + 1 })}>+</button>
                <span className="small muted">seats together (max 8)</span>
              </div>
            </fieldset>

            <fieldset className="stack-sm plain-fieldset">
              <legend className="field" style={{ marginBottom: 6 }}>Budget per ticket</legend>
              <p className="small muted">Prices at this show: <b>{money(lo)} – {money(hi)}</b> per ticket, plus a {money(BOOKING_FEE)} booking fee.</p>
              <label className="checkbox">
                <input type="radio" name="budget" checked={!plan.maxPricePerTicket} onChange={() => setBudget(NO_LIMIT)} />
                <span><b>No limit</b><br /><span className="small muted">Every section stays available to rank.</span></span>
              </label>
              <label className="checkbox">
                <input type="radio" name="budget" checked={!!plan.maxPricePerTicket} onChange={() => setBudget(Math.ceil((lo + hi) / 2 / 5) * 5)} />
                <span><b>Set a maximum</b><br /><span className="small muted">Sections above it are switched off so prices can't surprise you.</span></span>
              </label>
              {!!plan.maxPricePerTicket && (
                <label className="field" style={{ paddingLeft: 30 }}>
                  <span>Up to <b>{money(plan.maxPricePerTicket)}</b> per ticket · {fits} of {arena.sections.length} sections fit</span>
                  <input type="range" min={lo} max={hi} step={5} value={plan.maxPricePerTicket} onChange={(e) => setBudget(Number(e.target.value))} />
                </label>
              )}
              {dropped.length > 0 && <p className="small" role="status" style={{ color: 'var(--warning-ink)' }}>Removed from your picks: {dropped.join(', ')} (over your new budget).</p>}
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="plan-sections-step">
            <div className="stack-sm">
              <span className="field">Tap up to 3 sections, in order of preference</span>
              <ArenaMap
                arena={arena}
                label="Choose your sections"
                rankedIds={plan.rankedSectionIds}
                pressed={(s) => plan.rankedSectionIds.includes(s.id)}
                info={info}
                onSelect={toggle}
              />
            </div>
            <div className="stack">
              <div className="stack-sm">
                <span className="field">Your choices</span>
                {ranked.length ? (
                  <ol className="plan-sections">
                    {ranked.map((s) => (
                      <li key={s.id}>
                        <span>{s.name} <span className="muted">· {money(s.price)}</span></span>
                        <button className="link-btn small" onClick={() => toggle(s)} aria-label={`Remove ${s.name}`}>Remove</button>
                      </li>
                    ))}
                  </ol>
                ) : <p className="small muted">None yet. Tap a section on the map.</p>}
              </div>
              <fieldset className="stack-sm plain-fieldset">
                <legend className="field" style={{ marginBottom: 6 }}>If my first choice sells out…</legend>
                <label className="checkbox">
                  <input type="radio" name="rule" checked={plan.rule === 'ask-me'} onChange={() => setPlan({ ...plan, rule: 'ask-me' })} />
                  <span><b>Ask me first</b><br /><span className="small muted">You get 60 seconds to choose. Your place is kept.</span></span>
                </label>
                <label className="checkbox">
                  <input type="radio" name="rule" checked={plan.rule === 'auto-next'} onChange={() => setPlan({ ...plan, rule: 'auto-next' })} />
                  <span><b>Move to my next choice automatically</b><br /><span className="small muted">Best if you want to look away completely.</span></span>
                </label>
              </fieldset>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack review">
            <p>Check your plan. The queue will track these sections for you.</p>
            <dl className="review-list">
              <div><dt>Tickets</dt><dd>{ticketsText(plan.quantity)}, {budgetText(plan)}</dd><button className="link-btn small" onClick={() => setStep(0)}>Edit</button></div>
              <div>
                <dt>Sections</dt>
                <dd>
                  <ol className="plan-sections">
                    {ranked.map((s) => <li key={s.id}><span>{s.name}</span><span className="muted num">{money(s.price)} each</span></li>)}
                  </ol>
                </dd>
                <button className="link-btn small" onClick={() => setStep(1)}>Edit</button>
              </div>
              <div><dt>If one sells out</dt><dd>{ruleText(plan.rule)}</dd><button className="link-btn small" onClick={() => setStep(1)}>Edit</button></div>
            </dl>
          </div>
        )}

        <div className="modal-footer">
          {step > 0 ? <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button> : <button className="btn btn-ghost" onClick={onClose}>Cancel</button>}
          {step < 2 ? (
            <button className="btn btn-primary" disabled={step === 1 && !ranked.length} onClick={() => setStep(step + 1)}>
              {step === 1 ? 'Review plan' : 'Next: sections'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={save}>{saveLabel}</button>
          )}
        </div>
      </div>
    </Modal>
  )
}
