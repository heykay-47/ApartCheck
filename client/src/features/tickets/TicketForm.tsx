import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { useCurrentUser } from '../auth/auth-api'
import { useAssets, useAsset } from '../assets/asset-api'
import { useUnits, useUnit } from '../units/unit-api'
import { useCreateTicket, useMyUnit, type TicketInput } from './ticket-api'

function uniqueOptions<T extends { id: string }>(
  items: Array<T | undefined>,
): T[] {
  const options = new Map<string, T>()
  for (const item of items) {
    if (item) options.set(item.id, item)
  }
  return [...options.values()]
}

export function TicketForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: user } = useCurrentUser()
  const resident = user?.role === 'resident'
  const assetId = searchParams.get('assetId') ?? ''
  const [values, setValues] = useState<TicketInput>({
    unitId: '',
    assetId: assetId || null,
    title: '',
    description: '',
  })
  const [unitSearch, setUnitSearch] = useState('')
  const [unitPage, setUnitPage] = useState(1)
  const [assetSearch, setAssetSearch] = useState('')
  const [assetPage, setAssetPage] = useState(1)
  const myUnit = useMyUnit(resident)
  const units = useUnits(
    { page: unitPage, pageSize: 25, search: unitSearch },
    user?.role === 'admin',
  )
  const assets = useAssets({
    page: assetPage,
    pageSize: 25,
    search: assetSearch,
    category: '',
  })
  const prefilledAsset = useAsset(assetId)
  const create = useCreateTicket()
  const error = create.error instanceof ApiError ? create.error : undefined
  const selectedUnit = useUnit(user?.role === 'admin' ? values.unitId : '')

  const resetCreate = create.reset
  useEffect(() => {
    if (myUnit.data?.unit) {
      setValues((current) => ({ ...current, unitId: myUnit.data.unit.id }))
    }
  }, [myUnit.data])
  useEffect(() => {
    if (assetId && prefilledAsset.data) {
      setValues((current) => ({ ...current, assetId }))
    }
  }, [assetId, prefilledAsset.data])
  useEffect(() => () => resetCreate(), [resetCreate])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = { ...values }
    if (!input.assetId) delete input.assetId
    create.mutate(input, {
      onSuccess: (data) => navigate(`/tickets/${data.ticket.id}`),
    })
  }
  const chosenUnit = units.data?.units?.find(
    (unit) => unit.id === values.unitId,
  )
  const chosenAsset = assets.data?.assets?.find(
    (asset) => asset.id === values.assetId,
  )
  const unitOption = chosenUnit ?? selectedUnit.data
  const assetOption =
    chosenAsset ??
    (assetId && prefilledAsset.data ? prefilledAsset.data : undefined)
  const unitOptions = uniqueOptions([unitOption, ...(units.data?.units ?? [])])
  const assetOptions = uniqueOptions([
    assetOption,
    ...(assets.data?.assets ?? []),
  ])

  return (
    <section className="page ticket-form-page">
      <p className="eyebrow">TICKET / REPORT</p>
      <h1>Record the fault.</h1>
      <p className="lede">
        Capture the location and the work that needs a traceable response.
      </p>
      <form className="ticket-form" onSubmit={submit} noValidate>
        {resident ? (
          <div className="field">
            <span>Unit</span>
            <p>
              {myUnit.data?.unit
                ? `${myUnit.data.unit.building} / ${myUnit.data.unit.floor} / ${myUnit.data.unit.unitNumber}`
                : myUnit.isLoading
                  ? 'Loading your Unit…'
                  : myUnit.isError
                    ? 'Your Unit is unavailable. Ask the Society Administrator to confirm your current Unit.'
                    : 'Your Unit is unavailable.'}
            </p>
          </div>
        ) : (
          <>
            <label className="search-field">
              Find a unit
              <input
                name="unitSearch"
                autoComplete="off"
                value={unitSearch}
                onChange={(event) => {
                  setUnitSearch(event.target.value)
                  setUnitPage(1)
                }}
                placeholder="Example: Tower A or 401…"
              />
            </label>
            {units.isLoading ? (
              <p className="lookup-state" role="status">
                Reading active Units…
              </p>
            ) : units.isError ? (
              <Feedback message="Units are unavailable. Try again." />
            ) : units.data?.units.length === 0 ? (
              <p className="lookup-state">No active Units match this search.</p>
            ) : null}
            <FormField label="Unit" error={error?.fieldErrors.unitId?.[0]}>
              {(id) => (
                <select
                  id={id}
                  name="unitId"
                  autoComplete="off"
                  value={values.unitId}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      unitId: event.target.value,
                    }))
                  }
                >
                  <option value="">Choose a unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.building} / {unit.floor} / {unit.unitNumber}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <PaginationControls
              page={unitPage}
              pages={units.data?.pagination.pages ?? 1}
              onPage={setUnitPage}
            />
          </>
        )}
        <label className="search-field">
          Find an asset (optional)
          <input
            name="assetSearch"
            autoComplete="off"
            value={assetSearch}
            onChange={(event) => {
              setAssetSearch(event.target.value)
              setAssetPage(1)
            }}
            placeholder="Example: LFT-0007 or passenger lift…"
          />
        </label>
        {assets.isLoading ? (
          <p className="lookup-state" role="status">
            Reading active Assets…
          </p>
        ) : assets.isError ? (
          <Feedback message="Assets are unavailable. Try again." />
        ) : assets.data?.assets.length === 0 ? (
          <p className="lookup-state">No active Assets match this search.</p>
        ) : null}
        <FormField
          label="Asset (optional)"
          error={error?.fieldErrors.assetId?.[0]}
        >
          {(id) => (
            <select
              id={id}
              name="assetId"
              autoComplete="off"
              value={values.assetId ?? ''}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  assetId: event.target.value || null,
                }))
              }
            >
              <option value="">No linked asset</option>
              {assetOptions.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetCode} — {asset.name}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <PaginationControls
          page={assetPage}
          pages={assets.data?.pagination.pages ?? 1}
          onPage={setAssetPage}
        />
        <FormField label="Title" error={error?.fieldErrors.title?.[0]}>
          {(id) => (
            <input
              id={id}
              name="title"
              autoComplete="off"
              value={values.title}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              maxLength={120}
              placeholder="Example: Lift guide is worn…"
            />
          )}
        </FormField>
        <FormField
          label="Description"
          error={error?.fieldErrors.description?.[0]}
        >
          {(id) => (
            <textarea
              id={id}
              name="description"
              autoComplete="off"
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={7}
              maxLength={2000}
              placeholder="Describe what is happening, where it occurs, and what needs attention…"
            />
          )}
        </FormField>
        <Feedback message={error?.message} />
        <div className="dialog-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={create.isPending || !values.unitId}
          >
            Report ticket
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function PaginationControls({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (page: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button
        className="text-button"
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button
        className="text-button"
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
