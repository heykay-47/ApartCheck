import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import './landing.css'

const sourceUrl = 'https://github.com/heykay-47/ApartCheck'

const stages = [
  ['01', 'Register', 'Record category, location, install date, and state.'],
  ['02', 'Label', 'Issue a readable Asset Code and printable identity plate.'],
  ['03', 'Scan', 'Open the protected QR route from the physical location.'],
  ['04', 'Retrieve', 'Return the Society-scoped record after authentication.'],
] as const

const proof = [
  [
    'ROLE BOUNDARIES',
    'Administrator, Resident, and Technician access is enforced server-side.',
  ],
  [
    'SOCIETY ISOLATION',
    'Unit, Member, Asset, and QR lookups stay inside the authenticated Society.',
  ],
  [
    'CREDENTIAL HANDOFF',
    'Temporary passwords appear once and are never stored as plaintext.',
  ],
  [
    'DELIVERY GATES',
    'Formatting, linting, type checks, tests, build, browser, and accessibility checks run in CI.',
  ],
  [
    'LIVE SURFACE',
    'The deployed phone-width QR flow was verified with synthetic data.',
  ],
] as const

export function LandingPage(): JSX.Element {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#landing-content">
        Skip to landing content
      </a>

      <header className="landing-masthead">
        <a
          className="brand-mark"
          href="#landing-content"
          aria-label="ApartCheck home"
        >
          APART<span>CHECK</span>
        </a>
        <nav className="landing-nav" aria-label="Landing page">
          <a href="#mechanism">Mechanism</a>
          <a href="#proof">Proof</a>
          <a href="#architecture">Architecture</a>
        </nav>
        <a
          className="landing-primary-action"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Inspect source
        </a>
      </header>

      <main id="landing-content" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div>
            <h1 id="landing-title">Put a record where the work begins.</h1>
            <p>
              ApartCheck links a shared physical Asset to its protected Society
              record through a readable Asset Code and QR label.
            </p>
            <div className="landing-actions">
              <a
                className="landing-primary-action"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Inspect source
              </a>
              <Link className="landing-secondary-action" to="/login">
                Open the work record
              </Link>
            </div>
          </div>

          <div className="trace-plate">
            <p>SYNTHETIC RECORD</p>
            <div>
              <p>ASSET CODE</p>
              <strong>LFT-0007</strong>
            </div>
            <div>
              <p>ASSET</p>
              <strong>North tower passenger lift</strong>
            </div>
            <div>
              <p>LOCATION</p>
              <strong>Ground-floor lobby</strong>
            </div>
            <svg
              className="trace-qr"
              viewBox="0 0 48 48"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M2 2h14v14H2zM32 2h14v14H32zM2 32h14v14H2z" />
              <path d="M6 6h6v6H6zM36 6h6v6h-6zM6 36h6v6H6z" />
              <path d="M22 4h4v8h-4zM20 18h8v4h-8zM32 22h4v8h-4zM40 20h6v6h-6zM20 28h8v8h-8zM30 38h6v8h-6zM40 34h6v4h-6zM40 42h4v4h-4z" />
            </svg>
          </div>

          <ol className="trace-stages" aria-label="Asset trace stages">
            {stages.map(([number, name]) => (
              <li className="trace-stage" key={number}>
                <span>{number}</span>
                <strong>{name}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="mechanism-sequence"
          id="mechanism"
          aria-labelledby="mechanism-title"
        >
          <h2 id="mechanism-title">Trace the Asset.</h2>
          <ol>
            {stages.map(([number, name, description]) => (
              <li className="trace-stage" key={number}>
                <span>{number}</span>
                <h3>{name}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="proof-ledger"
          id="proof"
          aria-labelledby="proof-title"
        >
          <h2 id="proof-title">Engineering proof, on the record.</h2>
          <dl>
            {proof.map(([label, detail]) => (
              <div className="proof-row" key={label}>
                <dt>{label}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="architecture-strip"
          id="architecture"
          aria-labelledby="architecture-title"
        >
          <h2 id="architecture-title">One shipped path.</h2>
          <ol aria-label="Application architecture">
            <li>Browser</li>
            <li>Express API + static React client</li>
            <li>MongoDB Atlas</li>
          </ol>
          <ul aria-label="Architecture boundaries">
            <li>HTTPS + HttpOnly session</li>
            <li>same-origin deployment</li>
            <li>Society-scoped queries</li>
          </ul>
        </section>

        <section className="scope-boundary" aria-labelledby="scope-title">
          <h2 id="scope-title">The product boundary is explicit.</h2>
          <div>
            <h3>SHIPPED NOW</h3>
            <ul>
              <li>Society setup</li>
              <li>Units</li>
              <li>Members</li>
              <li>Assets</li>
              <li>Role boundaries</li>
              <li>Protected QR lookup</li>
            </ul>
          </div>
          <div>
            <h3>IMPLEMENTED LOCALLY — NOT LIVE</h3>
            <ul>
              <li>Tickets</li>
              <li>Technician assignment</li>
              <li>Verification</li>
              <li>Immutable history</li>
            </ul>
          </div>
          <div>
            <h3>DIRECTION, NOT CLAIM</h3>
            <ul>
              <li>Vendors</li>
              <li>Media evidence</li>
              <li>SLAs</li>
              <li>Notifications</li>
              <li>Analytics and exports</li>
              <li>Multi-Society administration</li>
            </ul>
          </div>
        </section>

        <section className="landing-close" aria-labelledby="close-title">
          <h2 id="close-title">Inspect the foundation.</h2>
          <p>Live data is synthetic. Demo credentials are private.</p>
          <div className="landing-actions">
            <a
              className="landing-primary-action"
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Inspect source
            </a>
            <Link className="landing-secondary-action" to="/login">
              Open the work record
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="brand-mark">
          APART<span>CHECK</span>
        </span>
        <p>Phase 1 accountability foundation</p>
        <a href={sourceUrl} target="_blank" rel="noreferrer">
          Source
        </a>
        <Link to="/login">Sign in</Link>
      </footer>
    </div>
  )
}
