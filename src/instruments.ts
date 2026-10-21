// Instrument silhouettes on a 32×32 grid, as SVG path data. The same shapes are drawn as obstacles in the
// Note Runner game (canvas Path2D) and as tiles in the human check at login (inline SVG).

export type InstrumentId = 'drum' | 'guitar' | 'trumpet' | 'piano' | 'metronome' | 'maracas'

// Layers are painted in order: 'ink' is the silhouette, 'paper' cuts details out of it.
export interface InstrumentShape {
  id: InstrumentId
  name: string
  plural: string
  layers: { d: string; fill: 'ink' | 'paper' }[]
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`

export const instruments: Record<InstrumentId, InstrumentShape> = {
  drum: {
    id: 'drum', name: 'drum', plural: 'drums',
    layers: [
      { d: 'M4 13a12 4 0 0 1 24 0v11a12 4 0 0 1-24 0Z M19 2.5l1.4-1.4 6.6 6.6-1.4 1.4Z M6 6.5l1.4-1.4 5 5-1.4 1.4Z', fill: 'ink' },
      { d: 'M6.5 13a9.5 2.6 0 0 1 19 0a9.5 2.6 0 0 1-19 0Z M7 18l4 6h-1.6l-3.4-5Z M25 18l-4 6h1.6l3.4-5Z', fill: 'paper' },
    ],
  },
  guitar: {
    id: 'guitar', name: 'guitar', plural: 'guitars',
    layers: [
      { d: `M14.6 1h2.8v2h1v2h-1v11h-2.8V5h-1V3h1Z ${circle(16, 17.5, 4.6)} ${circle(16, 24.5, 6.2)}`, fill: 'ink' },
      { d: `${circle(16, 21, 1.8)} M13 27.4h6v1.2h-6Z`, fill: 'paper' },
    ],
  },
  trumpet: {
    id: 'trumpet', name: 'trumpet', plural: 'trumpets',
    layers: [
      { d: 'M2 15h17v4H2Z M18 13.5L30 7v20l-12-6.5Z M7 10h2.4v5H7Z M11 10h2.4v5H11Z M15 10h2.4v5H15Z M2 13h2v8H2Z M6 19h12v3.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z', fill: 'ink' },
      { d: 'M8 20.2h8v2H8Z', fill: 'paper' },
    ],
  },
  piano: {
    id: 'piano', name: 'piano keyboard', plural: 'piano keyboards',
    layers: [
      { d: 'M1 9h30v16H1Z', fill: 'ink' },
      { d: 'M2.5 10.5h4.6v13H2.5Z M8.4 10.5h4.6v13H8.4Z M14.3 10.5h4.6v13h-4.6Z M20.2 10.5h4.6v13h-4.6Z M26.1 10.5h3.4v13h-3.4Z', fill: 'paper' },
      { d: 'M6 10.5h3.4v7.5H6Z M11.9 10.5h3.4v7.5h-3.4Z M23.7 10.5h3.4v7.5h-3.4Z', fill: 'ink' },
    ],
  },
  metronome: {
    id: 'metronome', name: 'metronome', plural: 'metronomes',
    layers: [
      { d: 'M12 2h8l6 27H6Z', fill: 'ink' },
      { d: 'M13.4 5h5.2l3.4 15h-12Z M10 23h12v2H10Z', fill: 'paper' },
      { d: 'M15.2 20.5l5.6-14 1.5.6-5.6 14Z', fill: 'ink' },
    ],
  },
  maracas: {
    id: 'maracas', name: 'maraca', plural: 'maracas',
    layers: [
      { d: `${circle(10, 9, 6)} M8.8 13h2.4v17H8.8Z ${circle(22, 13, 5.5)} M20.8 17h2.4v13h-2.4Z`, fill: 'ink' },
      { d: 'M6.5 7.5h7v1.4h-7Z M6.8 10.2h6.4v1.2H6.8Z M18.8 11.6h6.4v1.3h-6.4Z M19 14.1h6v1.1h-6Z', fill: 'paper' },
    ],
  },
}

export const instrumentIds = Object.keys(instruments) as InstrumentId[]
