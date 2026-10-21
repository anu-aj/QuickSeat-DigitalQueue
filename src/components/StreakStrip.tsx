import type { DayState, StreakRecord } from '../types'
import { PRESALE_WINDOW_DAYS } from '../streak'
import Icon from './Icon'

const label: Record<DayState, string> = {
  correct: 'Correct',
  tried: 'Tried',
  missed: 'Missed',
  today: 'Today',
  future: 'Coming up',
  before: 'Before you joined',
}

interface Props {
  states: DayState[]
  record: StreakRecord
  daysUntil: number
}

function CellMark({ state, timeout }: { state: DayState; timeout: boolean }) {
  if (state === 'correct') return <Icon name="check" />
  if (state === 'tried') return timeout ? <Icon name="clock" /> : <span className="streak-dot" />
  if (state === 'missed') return <span className="streak-dash" />
  return null
}

// The 30-day window as a week-by-week grid, then the sale day. Markers are large, each carries an icon and
// a day number, and the whole grid has a text alternative, so it never relies on colour alone (H1).
export default function StreakStrip({ states, record, daysUntil }: Props) {
  const count = (s: DayState) => states.filter((x) => x === s).length
  const toGo = count('future') + count('today')
  const summary = `Streak calendar for the ${PRESALE_WINDOW_DAYS} days before the sale: ${count('correct')} correct, ${count('tried')} tried, ${count('missed')} missed${toGo ? `, ${toGo} to go` : ''}.`

  return (
    <div className="streak-strip" role="img" aria-label={summary}>
      {states.map((state, i) => {
        const timeout = record.days[i + 1]?.result === 'timeout'
        return (
          <span key={i} className="streak-day" title={`Day ${i + 1}: ${timeout ? 'Time\'s up' : label[state]}`}>
            <span className={`streak-cell s-${state}`}><CellMark state={state} timeout={timeout} /></span>
            <span className="streak-n">{i + 1}</span>
          </span>
        )
      })}
      <span className="streak-day" title="Sale day">
        <span className={`streak-cell s-sale ${daysUntil === 0 ? 'is-today' : ''}`}><Icon name="ticket" /></span>
        <span className="streak-n">Sale</span>
      </span>
    </div>
  )
}

export function StreakLegend() {
  return (
    <ul className="streak-legend" aria-label="Key">
      <li><span className="streak-cell s-correct"><Icon name="check" /></span> Correct</li>
      <li><span className="streak-cell s-tried"><span className="streak-dot" /></span> Tried</li>
      <li><span className="streak-cell s-missed"><span className="streak-dash" /></span> Missed</li>
      <li><span className="streak-cell s-today" /> Today</li>
      <li><span className="streak-cell s-sale"><Icon name="ticket" /></span> Sale day</li>
    </ul>
  )
}
