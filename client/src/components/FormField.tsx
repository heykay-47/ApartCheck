import type { ReactNode } from 'react'
import { useId } from 'react'
export function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string | undefined
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}
