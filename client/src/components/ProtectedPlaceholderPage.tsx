import { useParams } from 'react-router-dom'

export function ProtectedPlaceholderPage({
  title,
  param,
}: {
  title: string
  param?: string
}) {
  const params = useParams()
  const value = param ? params[param] : undefined
  return (
    <section className="page placeholder-page">
      <p className="eyebrow">PROTECTED RECORD / TASK 12</p>
      <h1>{title}</h1>
      <p className="lede">
        This protected work surface is reserved for the next task.
      </p>
      {value ? <code>{value}</code> : null}
    </section>
  )
}
