import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { useUnits, type Unit } from '../units/unit-api'
import {
  useCreateUser,
  useUpdateUser,
  type TemporaryCredentialResponse,
  type User,
  type UserInput,
} from './user-api'

export function UserForm({
  user,
  onSuccess,
  onCancel,
}: {
  user?: User
  onSuccess?: (credential?: TemporaryCredentialResponse) => void
  onCancel?: () => void
}) {
  const [values, setValues] = useState<UserInput>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role: user?.role ?? 'admin',
    ...(user?.unitId ? { unitId: user.unitId } : {}),
  })
  const create = useCreateUser()
  const updateUser = useUpdateUser()
  const units = useUnits({ page: 1, pageSize: 100, search: '' })
  const mutation = user ? updateUser : create
  const error = mutation.error instanceof ApiError ? mutation.error : undefined
  const resident = values.role === 'resident'

  function update<K extends keyof UserInput>(key: K, value: UserInput[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = { ...values }
    if (input.role !== 'resident') delete input.unitId
    if (user) {
      updateUser.mutate(
        { id: user.id, input },
        { onSuccess: () => onSuccess?.() },
      )
    } else {
      create.mutate(input, {
        onSuccess: (response) => {
          onSuccess?.(response)
          create.reset()
        },
      })
    }
  }

  return (
    <form className="user-form" onSubmit={submit} noValidate>
      <FormField label="Name" error={error?.fieldErrors.name?.[0]}>
        {(id) => (
          <input
            id={id}
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Email" error={error?.fieldErrors.email?.[0]}>
        {(id) => (
          <input
            id={id}
            type="email"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Phone" error={error?.fieldErrors.phone?.[0]}>
        {(id) => (
          <input
            id={id}
            value={values.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Role" error={error?.fieldErrors.role?.[0]}>
        {(id) => (
          <select
            id={id}
            value={values.role}
            onChange={(e) =>
              update('role', e.target.value as UserInput['role'])
            }
          >
            <option value="resident">Resident</option>
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
          </select>
        )}
      </FormField>
      {resident ? (
        <FormField label="Unit" error={error?.fieldErrors.unitId?.[0]}>
          {(id) => (
            <select
              id={id}
              value={values.unitId ?? ''}
              onChange={(e) => update('unitId', e.target.value)}
            >
              <option value="">Select active unit</option>
              {(units.data?.items ?? []).map((unit) => {
                const archivedAt = (
                  unit as Unit & { archivedAt?: string | null }
                ).archivedAt
                return (
                  <option
                    key={unit.id}
                    value={unit.id}
                    disabled={Boolean(archivedAt)}
                  >
                    {unit.building} / {unit.floor} / {unit.unitNumber}
                    {archivedAt ? ' (archived)' : ''}
                  </option>
                )
              })}
            </select>
          )}
        </FormField>
      ) : null}
      <Feedback message={error?.message} />
      <div className="dialog-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={mutation.isPending}
        >
          {user ? 'Save account' : 'Create account'}
        </button>
        {onCancel ? (
          <button className="text-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
