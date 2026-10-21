import { useState } from 'react'
import type { Artist, ArtistId, Tour } from '../types'

interface Props {
  artist: Artist
  tour: Tour
  small?: boolean
}

// One motif per artist, drawn from their live show, so the three posters read as different events (J6).
function Motif({ id }: { id: ArtistId }) {
  if (id === 'taylor-swift') {
    // Era bands: stacked diagonal stripes, like the setlist moving through eras.
    return (
      <svg className="motif" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <rect key={i} x={-60} y={-40 + i * 30} width={340} height={14} fill="#fff" opacity={0.06 + (i % 3) * 0.05} transform="rotate(-18 100 130)" />
        ))}
        {[[150, 40], [170, 70], [132, 64], [160, 100]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 7}L${x + 2} ${y - 2}L${x + 7} ${y}L${x + 2} ${y + 2}L${x} ${y + 7}L${x - 2} ${y + 2}L${x - 7} ${y}L${x - 2} ${y - 2}Z`} fill="#fff" opacity={0.7} />
        ))}
      </svg>
    )
  }
  if (id === 'bts') {
    // Seven stage-light beams fanning down from the rig.
    return (
      <svg className="motif" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => {
          const x = 22 + i * 26
          return <path key={i} d={`M${x} -4 L${x - 30 + i * 10} 200 L${x + 6 + i * 10} 200 L${x + 6} -4 Z`} fill="#fff" opacity={0.08 + (i % 2) * 0.05} />
        })}
        {Array.from({ length: 7 }, (_, i) => <circle key={i} cx={25 + i * 26} cy={8} r={5} fill="#fff" opacity={0.85} />)}
      </svg>
    )
  }
  // Piano keys across the top: just Charlie and a piano.
  return (
    <svg className="motif" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x={0} y={18} width={200} height={70} fill="#fff" opacity={0.85} />
      {Array.from({ length: 14 }, (_, i) => <line key={i} x1={i * 14.3} y1={18} x2={i * 14.3} y2={88} stroke="#000" strokeOpacity={0.35} />)}
      {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((k) => <rect key={k} x={k * 14.3 + 9} y={18} width={9} height={42} fill="#111" />)}
    </svg>
  )
}

// Uses a real poster when one is configured, otherwise a generated gig poster.
export default function Poster({ artist, tour, small }: Props) {
  const [failed, setFailed] = useState(false)
  const url = tour.posterUrl || artist.posterUrl
  const [from, to] = artist.posterGradient
  const label = `${artist.name}: ${tour.name} poster`

  if (url && !failed) {
    return (
      <div className={`poster ${small ? 'poster-sm' : ''}`}>
        <img src={url} alt={label} onError={() => setFailed(true)} loading="lazy" />
      </div>
    )
  }

  return (
    <div className={`poster ${small ? 'poster-sm' : ''}`} role="img" aria-label={label}>
      <div className="poster-gen" style={{ background: `linear-gradient(170deg, ${from} 0%, ${to} 100%)` }}>
        <svg className="grain" aria-hidden="true">
          <filter id={`n-${artist.id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#n-${artist.id})`} />
        </svg>
        <Motif id={artist.id} />
        <div className="poster-live">Live · Australia</div>
        <div className="poster-artist">{artist.name}</div>
        <div className="poster-tour">{tour.name}</div>
      </div>
    </div>
  )
}
