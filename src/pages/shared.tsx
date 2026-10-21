import { useEffect, type ReactNode } from 'react'
import { useStore } from '../store'
import { href } from '../router'
import { setPrefs, usePrefs } from '../audio'
import type { Section, Show, TicketPlan } from '../types'
import { formatShowDate, money } from '../seats'
import { planPill, rankedSections, ruleText } from '../plan'
import Icon from '../components/Icon'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · QuickSeat` : 'QuickSeat'
  }, [title])
}

// Shown in place of a page that needs an account, instead of silently redirecting.
export function LoginGate({ reason, children }: { reason: string; children: ReactNode }) {
  const { user, openLogin } = useStore()
  if (user) return <>{children}</>
  return (
    <div className="container page narrow">
      <div className="empty stack" style={{ alignItems: 'center' }}>
        <h1 style={{ fontSize: 28 }}>Log in to continue</h1>
        <p className="muted">{reason}</p>
        <button className="btn btn-primary" onClick={() => openLogin('login', reason)}>Log in</button>
      </div>
    </div>
  )
}

export function ShowHeader({ show, right }: { show: Show; right?: ReactNode }) {
  const store = useStore()
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  return (
    <div className="row between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, alignItems: 'flex-start' }}>
      <div className="stack-sm" style={{ gap: 2 }}>
        <a href={href(`/tour/${tour.id}`)} style={{ textDecoration: 'none' }}><strong>{artist.name}: {tour.name}</strong></a>
        <span className="small muted">{formatShowDate(show.date, arena.timeZone)} · {arena.name}, {arena.city}</span>
      </div>
      {right}
    </div>
  )
}

// The plan in full: every ranked section with its price, so "is my budget still right?" can be checked at a glance.
export function PlanCard({ plan, sections, editHref, title = 'Your plan' }: { plan: TicketPlan; sections: Section[]; editHref?: string; title?: string }) {
  return (
    <section className="card surface stack-sm plan-card" aria-label={title}>
      <div className="row between">
        <span className="eyebrow">{title}</span>
        {editHref && <a className="link-btn small" href={editHref}>Edit plan</a>}
      </div>
      <p><b>{planPill(plan)}</b></p>
      <ol className="plan-sections">
        {rankedSections(plan, sections).map((s) => (
          <li key={s.id}><span>{s.name}</span><span className="muted num">{money(s.price)} each</span></li>
        ))}
      </ol>
      <p className="small muted">{ruleText(plan.rule)}</p>
    </section>
  )
}

const notifySupported = () => typeof Notification !== 'undefined'

// Asked once, clearly, when the fan joins: "safe to look away" only works if alerts are on.
// After that it shrinks to a small "Alerts" control.
export function AlertsControl() {
  const prefs = usePrefs()
  const supported = notifySupported()

  if (!prefs.alertAsked) {
    const yes = async () => {
      const granted = supported ? (await Notification.requestPermission()) === 'granted' : false
      setPrefs({ notify: granted, sound: true, alertAsked: true })
    }
    return (
      <section className="card alert-ask" aria-labelledby="alert-ask-h">
        <Icon name="bell" size={24} />
        <div className="stack-sm">
          <h2 id="alert-ask-h" style={{ fontSize: 18 }}>Want an alert if your plan changes?</h2>
          <p className="small muted">We'll play a soft chime{supported ? ' and send a notification, even when you\'re in another tab' : ''}. Then you can look away.</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={yes}>Yes, alert me</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPrefs({ alertAsked: true, notify: false })}>No thanks</button>
          </div>
        </div>
      </section>
    )
  }

  const on = prefs.notify && supported && Notification.permission === 'granted'
  const state = on ? (prefs.sound ? 'On' : 'Notifications only') : prefs.sound ? 'Chime only' : 'Off'
  return (
    <details className="alerts-ctl">
      <summary><Icon name={on || prefs.sound ? 'bell' : 'mute'} size={16} /> Alerts: <b>{state}</b></summary>
      <div className="alerts-ctl-body"><AlertSettings /></div>
    </details>
  )
}

// Opt-in alerts: permission is only requested when the user ticks the box.
export function AlertSettings() {
  const prefs = usePrefs()
  const supported = notifySupported()
  return (
    <div className="row" style={{ gap: '8px 24px' }}>
      {supported && (
        <label className="checkbox small">
          <input
            type="checkbox"
            checked={prefs.notify && Notification.permission === 'granted'}
            onChange={async (e) => {
              if (!e.target.checked) return setPrefs({ notify: false })
              const result = await Notification.requestPermission()
              setPrefs({ notify: result === 'granted' })
            }}
          />
          <span>Notify me when my plan changes (even in another tab)</span>
        </label>
      )}
      <label className="checkbox small">
        <input type="checkbox" checked={prefs.sound} onChange={(e) => setPrefs({ sound: e.target.checked })} />
        <span>Play a soft chime for alerts</span>
      </label>
    </div>
  )
}

