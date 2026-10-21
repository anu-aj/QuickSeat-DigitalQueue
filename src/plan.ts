// Plain-language helpers for a ticket plan, shared by every screen that shows it.
import type { Section, TicketPlan } from './types'
import { money } from './seats.ts'

// A budget of 0 means "no limit": new plans start here so no section is hidden before the fan thinks about price.
export const NO_LIMIT = 0

export const budgetOf = (plan: Pick<TicketPlan, 'maxPricePerTicket'>) => plan.maxPricePerTicket || Infinity

export const overBudget = (plan: Pick<TicketPlan, 'maxPricePerTicket'>, price: number) => price > budgetOf(plan)

export const budgetText = (plan: Pick<TicketPlan, 'maxPricePerTicket'>) =>
  plan.maxPricePerTicket ? `up to ${money(plan.maxPricePerTicket)} each` : 'any price'

export const ticketsText = (quantity: number) => `${quantity} ${quantity === 1 ? 'ticket' : 'tickets together'}`

export const rankedSections = (plan: TicketPlan, sections: Section[]) =>
  plan.rankedSectionIds.map((id) => sections.find((s) => s.id === id)).filter((s): s is Section => Boolean(s))

export const ruleText = (rule: TicketPlan['rule']) =>
  rule === 'ask-me' ? 'If a choice sells out, we\'ll ask you first.' : 'If a choice sells out, we\'ll move you to the next one.'

// "2 tickets together, up to $180 each: Floor B, then Section 12, then Section 34. If a choice sells out, we'll ask you first."
export function planSummary(plan: TicketPlan, sections: Section[]) {
  const names = rankedSections(plan, sections).map((s) => s.name)
  const order = names.length ? names.join(', then ') : 'no sections chosen yet'
  return `${ticketsText(plan.quantity)}, ${budgetText(plan)}: ${order}. ${ruleText(plan.rule)}`
}

// Short form for the pinned plan pill.
export const planPill = (plan: TicketPlan) => `${ticketsText(plan.quantity)}, ${budgetText(plan)}`
