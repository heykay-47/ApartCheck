import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { ProductPreview } from './ProductPreview'
import { WorkflowTour } from './WorkflowTour'
import './landing.css'

const sourceUrl = 'https://github.com/heykay-47/ApartCheck'

function LandingHeader(): JSX.Element {
  return (
    <header
      className="landing-masthead"
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
    >
      <a
        className="brand-mark"
        href="#landing-content"
        aria-label="ApartCheck home"
      >
        APART<span>CHECK</span>
      </a>
      <nav className="landing-nav" aria-label="Landing page">
        <a href="#product-tour">Product</a>
        <a href="#workflow">Workflow</a>
        <a href="#security">Security</a>
      </nav>
      <Link
        className="landing-secondary-action landing-header-action"
        to="/login"
      >
        Sign in
      </Link>
    </header>
  )
}

const evidence = [
  ['Three enforced Member roles', 'Administrator, Resident, and Technician.'],
  [
    'Society-scoped records',
    'Every Unit, Asset, Member, and Ticket stays in its Society.',
  ],
  [
    'Deployed Ticket workflow',
    'Report, assign, complete, verify, and preserve history.',
  ],
  [
    'Automated delivery gates',
    'Formatting, linting, type checks, tests, and build checks.',
  ],
] as const

export function LandingPage(): JSX.Element {
  const landingRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const landingRoot = landingRootRef.current

    if (
      !landingRoot ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const revealTargets =
      landingRoot.querySelectorAll<HTMLElement>('[data-reveal]')

    if (!('IntersectionObserver' in window)) {
      landingRoot.classList.add('is-reveal-ready')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )

    revealTargets.forEach((target) => observer.observe(target))
    landingRoot.classList.add('is-reveal-ready')

    return () => {
      observer.disconnect()
      landingRoot.classList.remove('is-reveal-ready')
    }
  }, [])

  return (
    <div className="landing-page" ref={landingRootRef}>
      <a className="skip-link" href="#landing-content">
        Skip to landing content
      </a>

      <LandingHeader />

      <main id="landing-content" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div data-reveal>
            <h1 id="landing-title">Every repair. One accountable record.</h1>
            <p>
              ApartCheck gives a Society one place to see what happened to a
              shared Asset: who reported the issue, who owns the work, what was
              completed, and who verified it.
            </p>
            <div className="landing-actions">
              <a className="landing-primary-action" href="#product-tour">
                Explore the product
              </a>
              <Link className="landing-secondary-action" to="/login">
                Sign in
              </Link>
            </div>
          </div>

          <div data-reveal>
            <ProductPreview step="verify" />
          </div>
        </section>

        <section
          className="proof-ledger evidence-strip"
          aria-label="Product evidence"
        >
          <dl>
            {evidence.map(([label, detail]) => (
              <div className="proof-row" data-reveal key={label}>
                <dt>{label}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          id="product-tour"
          className="product-tour"
          aria-labelledby="product-tour-title"
        >
          <h2 id="product-tour-title">
            Maintenance work, without the missing middle.
          </h2>
          <p className="section-intro">
            The product keeps the physical Asset, the Ticket, and the
            accountable history in the same readable record.
          </p>
          <div className="benefit-sections">
            <section className="benefit-section" aria-labelledby="asset-title">
              <div data-reveal>
                <h3 id="asset-title">Know the Asset before work begins.</h3>
                <p>
                  Start with the Unit and Asset identity, not a vague message
                  thread. The record gives the person doing the work the place,
                  equipment, and context before the first visit.
                </p>
              </div>
              <div data-reveal>
                <ProductPreview step="report" compact />
              </div>
            </section>

            <section
              className="benefit-section"
              aria-labelledby="responsibility-title"
            >
              <div data-reveal>
                <h3 id="responsibility-title">Keep responsibility visible.</h3>
                <p>
                  Assignment is a recorded step. Administrators can see who owns
                  the inspection, while Technicians can see the work that is
                  waiting for them.
                </p>
              </div>
              <div data-reveal>
                <ProductPreview step="assign" compact />
              </div>
            </section>

            <section
              className="benefit-section"
              aria-labelledby="history-title"
            >
              <div data-reveal>
                <h3 id="history-title">Preserve what happened.</h3>
                <p>
                  Completion notes and verification stay attached to the Ticket.
                  The next person gets the sequence, not a reconstructed story.
                </p>
              </div>
              <div data-reveal>
                <ProductPreview step="complete" compact />
              </div>
            </section>
          </div>
        </section>

        <section
          id="workflow"
          className="mechanism-sequence"
          aria-labelledby="workflow-title"
        >
          <h2 id="workflow-title">
            Follow the Ticket from report to verification.
          </h2>
          <div data-reveal>
            <WorkflowTour />
          </div>
        </section>

        <section
          id="security"
          className="scope-boundary"
          aria-labelledby="security-title"
        >
          <h2 id="security-title">
            Accountability only works when the boundaries hold.
          </h2>
          <div data-reveal>
            <h3>SERVER-ENFORCED</h3>
            <ul>
              <li>Three Member roles are checked on the server.</li>
              <li>Every resource query includes the authenticated Society.</li>
              <li>Sessions stay in HttpOnly cookies.</li>
            </ul>
          </div>
          <div data-reveal>
            <h3>QUIET FAILURES</h3>
            <ul>
              <li>Unknown and archived records do not disclose their state.</li>
              <li>
                Malformed and cross-Society lookups remain indistinguishable.
              </li>
              <li>Protected routes return only what the Member can access.</li>
            </ul>
          </div>
        </section>

        <section
          className="landing-close"
          data-reveal
          aria-labelledby="close-title"
        >
          <h2 id="close-title">See the record before you sign in.</h2>
          <p>
            Records shown here are generated for demonstration. Sign in to
            inspect the deployed experience if you are already a Member.
          </p>
          <div className="landing-actions">
            <a className="landing-primary-action" href="#product-tour">
              Explore the product
            </a>
            <Link className="landing-secondary-action" to="/login">
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="brand-mark">
          APART<span>CHECK</span>
        </span>
        <p>Asset &amp; Ticket accountability</p>
        <p className="landing-disclosure">Synthetic records only.</p>
        <a
          className="landing-footer-link"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          GitHub source
        </a>
      </footer>
    </div>
  )
}
