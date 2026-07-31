import { useDeferredValue, useState } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { Modal } from '../../components/Modal'
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
              {units.data?.pagination.total ?? 0} records
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
          ) : units.data?.units.length ? (
            <div className="unit-ledger">
              {units.data.units.map((unit) => (
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
          {units.data && units.data.pagination.pages > 1 ? (
            <div className="pagination">
              <button
                className="text-button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {units.data.pagination.pages}
              </span>
              <button
                className="text-button"
                disabled={page === units.data.pagination.pages}
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
        <Modal
          className="confirm-panel"
          labelledBy="archive-heading"
          onClose={() => setArchive(null)}
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
        </Modal>
      ) : null}
    </section>
  )
}
