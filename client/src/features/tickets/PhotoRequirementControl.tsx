import { useEffect, useState } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { useUpdatePhotoRequirement } from './ticket-api'

const photoCounts = [0, 1, 2, 3, 4, 5]

export function PhotoRequirementControl({
  ticketId,
  requiredPhotoCount,
}: {
  ticketId: string
  requiredPhotoCount: number
}) {
  const [count, setCount] = useState(requiredPhotoCount)
  const [success, setSuccess] = useState('')
  const update = useUpdatePhotoRequirement(ticketId)
  const error = update.error instanceof ApiError ? update.error : undefined

  useEffect(() => setCount(requiredPhotoCount), [requiredPhotoCount])

  function submit() {
    setSuccess('')
    update.mutate(
      { requiredPhotoCount: count },
      {
        onSuccess: () => setSuccess('Photo requirement saved.'),
      },
    )
  }

  return (
    <div className="photo-requirement-control">
      <h3>Photo requirement</h3>
      <FormField
        label="Required photos"
        error={error?.fieldErrors.requiredPhotoCount?.[0]}
      >
        {(id) => (
          <select
            id={id}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          >
            {photoCounts.map((value) => (
              <option key={value} value={value}>
                {value === 0
                  ? 'No photo required'
                  : `${value} photo${value === 1 ? '' : 's'}`}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <Feedback message={error?.message} />
      <Feedback message={success} tone="success" />
      <button
        className="primary-button"
        type="button"
        disabled={update.isPending}
        aria-busy={update.isPending}
        onClick={submit}
      >
        {update.isPending
          ? 'Saving photo requirement…'
          : 'Save photo requirement'}
      </button>
    </div>
  )
}
