import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import {
  assetCategories,
  useCreateAsset,
  useUpdateAsset,
  type Asset,
  type AssetInput,
} from './asset-api'

export function AssetForm({
  asset,
  onSaved,
}: {
  asset?: Asset
  onSaved?: (asset: Asset) => void
}) {
  const create = useCreateAsset()
  const update = useUpdateAsset(asset?.id ?? '')
  const mutation = asset ? update : create
  const [values, setValues] = useState<AssetInput>({
    name: asset?.name ?? '',
    category: asset?.category ?? 'lift',
    locationDescription: asset?.locationDescription ?? '',
    ...(asset?.installDate
      ? { installDate: asset.installDate.slice(0, 10) }
      : {}),
  })
  const error = mutation.error instanceof ApiError ? mutation.error : undefined
  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate(values, { onSuccess: (result) => onSaved?.(result.asset) })
  }
  return (
    <form className="asset-form" onSubmit={submit} noValidate>
      <FormField label="Asset name" error={error?.fieldErrors.name?.[0]}>
        {(id) => (
          <input
            id={id}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Category" error={error?.fieldErrors.category?.[0]}>
        {(id) => (
          <select
            id={id}
            value={values.category}
            onChange={(e) =>
              setValues({
                ...values,
                category: e.target.value as AssetInput['category'],
              })
            }
          >
            {assetCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <FormField
        label="Location"
        error={error?.fieldErrors.locationDescription?.[0]}
      >
        {(id) => (
          <input
            id={id}
            value={values.locationDescription}
            onChange={(e) =>
              setValues({ ...values, locationDescription: e.target.value })
            }
          />
        )}
      </FormField>
      <FormField
        label="Install date"
        error={error?.fieldErrors.installDate?.[0]}
      >
        {(id) => (
          <input
            id={id}
            type="date"
            value={values.installDate ?? ''}
            onChange={(e) => {
              const next = { ...values }
              if (e.target.value) next.installDate = e.target.value
              else delete next.installDate
              setValues(next)
            }}
          />
        )}
      </FormField>
      <Feedback message={error?.message} />
      <button className="primary-button" disabled={mutation.isPending}>
        {asset ? 'Save changes' : 'Create asset'}
      </button>
    </form>
  )
}
