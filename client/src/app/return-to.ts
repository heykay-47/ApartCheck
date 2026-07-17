export function safeReturnTo(value: string | null): string | null {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  )
    return null
  try {
    const target = new URL(value, window.location.origin)
    return target.origin === window.location.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : null
  } catch {
    return null
  }
}
