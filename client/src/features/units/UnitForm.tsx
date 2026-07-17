import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { useCreateUnit } from './unit-api'

export function UnitForm() {
  const create = useCreateUnit()
  const [values, setValues] = useState({
    building: '',
    floor: '',
    unitNumber: '',
  })
  const [created, setCreated] = useState(false)
  const error = create.error instanceof ApiError ? create.error : undefined

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    create.mutate(values, { onSuccess: () => setCreated(true) })
  }

  return (
    <form className="unit-form" onSubmit={submit} noValidate>
      <FormField label="Building" error={error?.fieldErrors.building?.[0]}>
        {(id) => (
          <input
            id={id}
            value={values.building}
            onChange={(e) => setValues({ ...values, building: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Floor" error={error?.fieldErrors.floor?.[0]}>
        {(id) => (
          <input
            id={id}
            value={values.floor}
            onChange={(e) => setValues({ ...values, floor: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Unit number" error={error?.fieldErrors.unitNumber?.[0]}>
        {(id) => (
          <input
            id={id}
            value={values.unitNumber}
            onChange={(e) =>
              setValues({ ...values, unitNumber: e.target.value })
            }
          />
        )}
      </FormField>
      <Feedback message={error?.message} />
      {created ? (
        <div className="unit-created">
          <Feedback
            message="Unit created. Create another unit?"
            tone="success"
          />
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setValues({ building: '', floor: '', unitNumber: '' })
              setCreated(false)
            }}
          >
            Create another unit
          </button>
        </div>
      ) : (
        <button
          className="primary-button"
          type="submit"
          disabled={create.isPending}
        >
          Create unit
        </button>
      )}
    </form>
  )
}
