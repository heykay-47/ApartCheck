import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

export function Modal({
  labelledBy,
  className,
  onClose,
  fallbackFocusRef,
  children,
}: {
  labelledBy: string
  className: string
  onClose: () => void
  fallbackFocusRef?: RefObject<HTMLElement | null>
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
      const focusTarget = previousFocus?.isConnected
        ? previousFocus
        : fallbackFocusRef?.current
      focusTarget?.focus()
    }
  }, [fallbackFocusRef])

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
