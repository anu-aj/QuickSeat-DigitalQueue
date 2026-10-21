// Queue wording rules from the UX audit (Q1, Q2, J1, O4). Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createQueue, lossStory, summarise, type QueueState } from './queue/simulator.ts'
import { NO_LIMIT, budgetOf, budgetText, overBudget, planSummary } from './plan.ts'
import type { Section, TicketPlan } from './types.ts'

const section = (id: string, name: string, price: number): Section => ({ id, name, kind: 'seated', position: 'side', rows: 6, seatsPerRow: 12, price })
const sections = [section('fb', 'Floor B', 165), section('s12', 'Section 12', 169), section('s34', 'Section 34', 139)]
const plan: TicketPlan = { showId: 'x', quantity: 2, maxPricePerTicket: NO_LIMIT, rankedSectionIds: ['fb', 's12', 's34'], rule: 'ask-me' }

function freshState(): QueueState {
  const q = createQueue({ plan, sections, showId: 'test' })
  const s = q.getState()
  q.dispose()
  return s
}

test('the queue starts with every section "Likely", so "No changes to your plan" is true (Q2)', () => {
  const s = freshState()
  assert.ok(s.sections.every((x) => x.status === 'likely'))
  assert.equal(s.alerts[0].title, 'No changes to your plan')
})

test('the headline names its section and says how the first choice is doing (Q1, J1)', () => {
  const s = freshState()
  s.sections = [
    { ...s.sections[0], status: 'at-risk' },
    { ...s.sections[1], status: 'unlikely' },
    { ...s.sections[2], status: 'likely' },
  ]
  const sum = summarise(s)
  assert.equal(sum.best?.name, 'Section 34')
  assert.equal(sum.rank, 3)
  assert.equal(sum.status, 'likely')
  assert.match(sum.sentence, /Your first choice, Floor B, is at risk\./)
  assert.match(sum.sentence, /Section 12 is unlikely to last\./)
})

test('when the first choice is the best chance, the summary says so', () => {
  const sum = summarise(freshState())
  assert.equal(sum.best?.name, 'Floor B')
  assert.equal(sum.sentence, 'This is your first choice.')
})

test('the sold-out story says what sold out and where the fan was in line (O4)', () => {
  const s = freshState()
  const gone = [
    { ...s.sections[0], status: 'sold-out' as const, lostAt: 1926 },
    { ...s.sections[1], status: 'cant-seat-together' as const, lostAt: 830 },
    { ...s.sections[2], status: 'sold-out' as const, lostAt: 207 },
  ]
  assert.equal(
    lossStory(gone, 2),
    'Floor B sold out when you were 1,926th in line, Section 12 could no longer seat 2 together when you were 830th, and Section 34 sold out when you were 207th.',
  )
})

test('a new plan has no budget limit, so no section is excluded before the fan chooses (T3)', () => {
  assert.equal(budgetOf(plan), Infinity)
  assert.equal(overBudget(plan, 999), false)
  assert.equal(budgetText(plan), 'any price')
  assert.equal(overBudget({ maxPricePerTicket: 150 }, 165), true)
})

test('the plan summary lists sections in order and the backup rule (J5)', () => {
  assert.equal(
    planSummary({ ...plan, maxPricePerTicket: 180 }, sections),
    '2 tickets together, up to $180 each: Floor B, then Section 12, then Section 34. If a choice sells out, we\'ll ask you first.',
  )
})
