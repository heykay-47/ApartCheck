export function AssetDashboard() {
  return (
    <section className="page">
      <p className="eyebrow">01 / FIELD DESK</p>
      <h1>Keep every repair accountable.</h1>
      <p className="lede">
        Open the asset ledger to inspect what is known, where it lives, and what
        needs attention next.
      </p>
      <a className="primary-button" href="/assets">
        Open asset ledger
      </a>
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
