import { useDeferredValue, useState } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { UnitForm } from './UnitForm'
import { useArchiveUnit, useUnits, type Unit } from './unit-api'

export function UnitsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [archive, setArchive] = useState<Unit | null>(null)
  const deferredSearch = useDeferredValue(search)
  const units = useUnits({ page, pageSize: 25, search: deferredSearch })
  const archiveMutation = useArchiveUnit()
  const archiveError =
    archiveMutation.error instanceof ApiError
      ? archiveMutation.error
      : undefined

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function confirmArchive() {
    if (!archive) return
    archiveMutation.mutate(archive.id, {
      onSuccess: () => setArchive(null),
    })
  }

  return (
    <section className="page units-page">
      <p className="eyebrow">02 / SOCIETY RECORD</p>
      <h1>Units, clearly accounted for.</h1>
      <p className="lede">
        Create the addresses that make resident accounts and maintenance records
        findable.
      </p>
      <div className="unit-layout">
        <div>
          <div className="section-heading">
            <h2>Unit ledger</h2>
            <span className="record-count">
              {units.data?.total ?? 0} records
            </span>
          </div>
          <label className="search-field">
            Search units
            <input
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Building, floor, or unit number"
            />
          </label>
          {units.isLoading ? (
            <p>Loading units...</p>
          ) : units.data?.items.length ? (
            <div className="unit-ledger">
              {units.data.items.map((unit) => (
                <div className="unit-row" key={unit.id}>
                  <div>
                    <span>Unit number</span>
                    <strong>{unit.unitNumber}</strong>
                  </div>
                  <div>
                    <span>Building</span>
                    <strong>{unit.building}</strong>
                  </div>
                  <div>
                    <span>Floor</span>
                    <strong>{unit.floor}</strong>
                  </div>
                  <button
                    className="text-button archive-button"
                    aria-label={`Archive unit ${unit.unitNumber}`}
                    onClick={() => setArchive(unit)}
                  >
                    Archive
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              No units yet. Create the first unit before adding resident
              accounts.
            </p>
          )}
          {units.data && units.data.pages > 1 ? (
            <div className="pagination">
              <button
                className="text-button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {units.data.pages}
              </span>
              <button
                className="text-button"
                disabled={page === units.data.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
        <aside className="ruled-panel">
          <p className="eyebrow">NEW ADDRESS</p>
          <h2>Create unit</h2>
          <UnitForm />
        </aside>
      </div>
      {archive ? (
        <div
          className="confirm-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-heading"
        >
          <h2 id="archive-heading">Archive unit {archive.unitNumber}?</h2>
          <p>
            This removes it from active records. Resident accounts must be moved
            or deactivated first.
          </p>
          <Feedback
            message={
              archiveError?.code === 'UNIT_HAS_ACTIVE_RESIDENTS'
                ? 'Move or deactivate active residents before archiving this unit.'
                : archiveError?.message
            }
          />
          <button
            className="primary-button"
            onClick={confirmArchive}
            disabled={archiveMutation.isPending}
          >
            Archive unit
          </button>
          <button className="text-button" onClick={() => setArchive(null)}>
            Cancel
          </button>
        </div>
      ) : null}
      <style>{`.unit-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);gap:42px;margin-top:48px}.section-heading{display:flex;align-items:baseline;justify-content:space-between;border-top:2px solid var(--color-slate);border-bottom:1px solid rgb(32 52 59 / .35)}.section-heading h2,.ruled-panel h2{font-family:var(--font-display);font-size:2.4rem;margin:12px 0}.record-count,.unit-row span,.search-field{font-family:var(--font-utility);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase}.search-field{display:grid;gap:8px;margin:24px 0}.search-field input{min-height:44px;padding:10px;border:1px solid var(--color-slate);background:var(--color-chalk);font:inherit;text-transform:none;letter-spacing:normal}.unit-row{display:grid;grid-template-columns:1.2fr 1fr .7fr auto;gap:16px;align-items:center;padding:17px 0;border-bottom:1px solid rgb(32 52 59 / .35)}.unit-row div{display:grid;gap:5px}.unit-row strong{font-size:1.05rem}.archive-button{color:var(--color-pump)}.ruled-panel{border-top:2px solid var(--color-slate);border-bottom:1px solid rgb(32 52 59 / .35);padding:0 18px 20px}.pagination{display:flex;justify-content:space-between;padding:20px 0;font-family:var(--font-utility);font-size:.8rem}.empty-state{border-bottom:1px solid rgb(32 52 59 / .35);padding:28px 0}.confirm-panel{position:fixed;right:24px;bottom:24px;z-index:2;max-width:440px;padding:24px;background:var(--color-chalk);border:2px solid var(--color-slate);box-shadow:8px 8px 0 var(--color-slate)}.confirm-panel h2{font-family:var(--font-display);font-size:2.5rem;margin:0 0 12px}.confirm-panel .text-button{margin-left:18px}.unit-created{display:grid;gap:10px}@media(max-width:800px){.unit-layout{grid-template-columns:1fr;gap:36px}.unit-row{grid-template-columns:1fr 1fr}.unit-row .archive-button{justify-self:start}.ruled-panel{padding-left:0;padding-right:0}}@media(max-width:480px){.unit-row{grid-template-columns:1fr}.confirm-panel{right:14px;bottom:14px;left:14px}}`}</style>
    </section>
  )
}
