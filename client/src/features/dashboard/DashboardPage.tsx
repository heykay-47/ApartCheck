export function DashboardPage() {
  return (
    <section className="page">
      <p className="eyebrow">01 / OPERATIONS</p>
      <h1>Keep every repair accountable.</h1>
      <p className="lede">
        A clear working record for shared buildings: what needs attention, who
        owns it, and what changed.
      </p>
      <div className="ledger-grid">
        <article>
          <span className="metric">--</span>
          <span>Open assets</span>
        </article>
        <article>
          <span className="metric metric-green">--</span>
          <span>Verified this month</span>
        </article>
        <article>
          <span className="metric metric-yellow">--</span>
          <span>Due for inspection</span>
        </article>
      </div>
    </section>
  )
}
