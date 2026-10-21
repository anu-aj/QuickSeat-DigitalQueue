import { useState } from 'react'
import { href } from '../router'
import { install, useInstall } from '../pwa'
import Icon from './Icon'

// A quiet install offer: a button where the browser supports it, Share-menu steps on iPhone, nothing once installed.
function InstallApp() {
  const { canInstall, standalone, ios } = useInstall()
  const [showSteps, setShowSteps] = useState(false)
  if (standalone) return null
  if (canInstall) {
    return (
      <button className="btn btn-secondary btn-sm install-btn" onClick={() => void install()}>
        <Icon name="ticket" size={16} /> Install the QuickSeat app
      </button>
    )
  }
  if (!ios) return null
  return (
    <div className="stack-sm">
      <button className="link-btn small" aria-expanded={showSteps} onClick={() => setShowSteps(!showSteps)}>Add QuickSeat to your home screen</button>
      {showSteps && <p className="small muted">In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>. QuickSeat then opens full screen, like an app.</p>}
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container stack">
        <nav className="footer-links" aria-label="Footer">
          <a href={href('/help')}>Help</a>
          <a href={href('/help')}>FAQ</a>
          <a href={href('/help')}>Accessibility</a>
          <a href={href('/help')}>Terms</a>
        </nav>
        <InstallApp />
        <p className="small muted">
          QuickSeat is a student design prototype (IDEA9106). No real tickets are sold. Artist names are used for illustration only.
        </p>
      </div>
    </footer>
  )
}
