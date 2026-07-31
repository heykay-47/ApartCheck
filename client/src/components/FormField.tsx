import { cloneElement, useId, type ReactElement } from 'react'
export function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string | undefined
  children: (id: string) => ReactElement
}) {
  const id = useId()
  const errorId = `${id}-error`
  const control = children(id) as ReactElement<{
    'aria-describedby'?: string
    'aria-invalid'?: boolean
  }>
  const describedBy = [control.props['aria-describedby'], errorId]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {error
        ? cloneElement(control, {
            'aria-describedby': describedBy,
            'aria-invalid': true,
          })
        : control}
      {error ? (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
