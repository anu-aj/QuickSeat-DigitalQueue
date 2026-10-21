import type { Arena, Section } from '../types'
import { makeSeatId, money } from '../seats'

// Every reason a block can't (or shouldn't) be picked has its own look and a visible label, never one shared grey.
export type BlockKind = 'available' | 'nearly' | 'sold-out' | 'cant-seat' | 'over-budget' | 'swap' | 'outside'

export interface BlockInfo {
  kind: BlockKind
  // Short visible label on the block, e.g. "Over $180" or "Sold out".
  note?: string
}

const BLOCKED: BlockKind[] = ['sold-out', 'cant-seat', 'over-budget']

const legendText: Record<Exclude<BlockKind, 'available'>, string> = {
  nearly: 'Nearly gone',
  'sold-out': 'Sold out',
  'cant-seat': 'Can\'t seat your group together',
  'over-budget': 'Over your budget',
  swap: 'You have 3 picks: tap one to swap it in',
  outside: 'Not in your plan',
}

interface Props {
  arena: Arena
  label: string
  rankedIds?: string[]
  activeId?: string
  info?: (section: Section) => BlockInfo
  onSelect?: (section: Section) => void
  pressed?: (section: Section) => boolean
}

// Venue map drawn as an arena: floor in front of the stage, side tiers either side, rear and upper tiers curving behind.
export default function ArenaMap({ arena, label, rankedIds = [], activeId, info, onSelect, pressed }: Props) {
  const blocks = arena.sections.map((s) => ({ s, ...(info?.(s) ?? { kind: 'available' as const }) }))
  const kinds = [...new Set(blocks.map((b) => b.kind))].filter((k): k is Exclude<BlockKind, 'available'> => k !== 'available')

  return (
    <div className="stack">
      <div className="arena-map" role="group" aria-label={label}>
        <div className="arena-stage" aria-hidden="true">STAGE</div>
        {blocks.map(({ s, kind, note }) => {
          const rank = rankedIds.indexOf(s.id) + 1
          const blocked = BLOCKED.includes(kind)
          const desc = [s.name, money(s.price), s.kind === 'standing' ? 'standing' : 'seated', rank ? `your choice ${rank}` : '', note ?? ''].filter(Boolean).join(', ')
          return (
            <button
              key={s.id}
              type="button"
              className={`arena-block sec-${s.id} k-${kind} pos-${s.position} ${activeId === s.id ? 'active' : ''}`}
              style={{ gridArea: s.id }}
              data-rank={rank || undefined}
              aria-pressed={pressed ? pressed(s) : undefined}
              aria-label={desc}
              disabled={!onSelect || blocked}
              onClick={() => onSelect?.(s)}
            >
              {rank > 0 && <span className="rank-dot" aria-hidden="true">{rank}</span>}
              <span>{s.name}</span>
              <span className="price">{money(s.price)}{s.kind === 'standing' ? ' · standing' : ''}</span>
              {note && <span className="block-note" aria-hidden="true">{note}</span>}
            </button>
          )
        })}
      </div>
      <ul className="legend" aria-hidden="true">
        {blocks.some((b) => b.kind === 'available') && <li><i /> Available</li>}
        {kinds.map((k) => <li key={k}><i className={`l-${k}`} /> {legendText[k]}</li>)}
        {rankedIds.length > 0 && <li><i className="l-ranked" /> Your ranked sections</li>}
      </ul>
    </div>
  )
}

interface SeatGridProps {
  section: Section
  taken: Set<string>
  selected: string[]
  onToggle: (id: string) => void
}

// Picked seats show their row and number in the grid itself, so the choice is readable without the summary (D7).
export function SeatGrid({ section, taken, selected, onToggle }: SeatGridProps) {
  return (
    <div className="seat-scroll">
      <div className="seat-grid" role="group" aria-label={`${section.name} seats. Front row is A, closest to the stage.`}>
        {Array.from({ length: section.rows }, (_, r) => {
          const row = String.fromCharCode(65 + r)
          return (
            <div className="seat-row" key={r}>
              <span className="row-label" aria-hidden="true">{row}</span>
              {Array.from({ length: section.seatsPerRow }, (_, s) => {
                const id = makeSeatId(section.id, r, s)
                const isTaken = taken.has(id)
                const picked = selected.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className="seat"
                    disabled={isTaken}
                    aria-pressed={picked}
                    aria-label={`Row ${row}, seat ${s + 1}${isTaken ? ', taken' : ''}`}
                    onClick={() => onToggle(id)}
                  >
                    {picked ? `${row}${s + 1}` : isTaken ? '' : s + 1}
                  </button>
                )
              })}
              <span className="row-label" aria-hidden="true">{row}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
