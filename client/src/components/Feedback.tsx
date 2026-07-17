export function Feedback({
  message,
  tone = 'error',
}: {
  message?: string | undefined
  tone?: 'error' | 'success' | undefined
}) {
  return message ? (
    <p
      className={`feedback feedback-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {message}
    </p>
  ) : null
}
