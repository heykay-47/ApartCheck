import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({
  labelledBy,
  className,
  onClose,
  children,
}: {
  labelledBy: string
  className: string
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement as HTMLElement | null

    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')

    dialog
      .querySelector<HTMLElement>('input, select, textarea, button, a[href]')
      ?.focus()

    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        onClose()
      }}
    >
      {children}
    </dialog>
  )
}
