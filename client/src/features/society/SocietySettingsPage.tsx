import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { useSociety, useUpdateSociety } from './society-api'

export function SocietySettingsPage() {
  const society = useSociety()
  const update = useUpdateSociety()
  const [values, setValues] = useState({ name: '', address: '' })
  const [loaded, setLoaded] = useState(false)
  if (society.data && !loaded) {
    setValues({ name: society.data.name, address: society.data.address })
    setLoaded(true)
  }
  const error = update.error instanceof ApiError ? update.error : undefined
  function submit(event: FormEvent) {
    event.preventDefault()
    update.mutate(values)
  }
  return (
    <section className="page">
      <p className="eyebrow">03 / SOCIETY IDENTITY</p>
      <h1>Keep society details current.</h1>
      <p className="lede">
        This identity appears wherever residents and operators need confidence
        in the record.
      </p>
      <form className="ruled-panel" onSubmit={submit}>
        <FormField label="Society name" error={error?.fieldErrors.name?.[0]}>
          {(id) => (
            <input
              id={id}
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Address" error={error?.fieldErrors.address?.[0]}>
          {(id) => (
            <textarea
              id={id}
              value={values.address}
              onChange={(e) =>
                setValues({ ...values, address: e.target.value })
              }
            />
          )}
        </FormField>
        <Feedback message={error?.message} />
        <button className="primary-button" disabled={update.isPending}>
          Save changes
        </button>
      </form>
    </section>
  )
}
