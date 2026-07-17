import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../app/api'
import { FormField } from '../../components/FormField'
import { Feedback } from '../../components/Feedback'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
const schema = z.object({
  societyName: z.string().min(1),
  address: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +14155550100'),
  password: z.string().min(12),
})
export function SetupPage() {
  const navigate = useNavigate()
  const status = useQuery({
    queryKey: ['bootstrap-status'],
    queryFn: () => api<{ initialized: boolean }>('/api/bootstrap/status'),
  })
  useEffect(() => {
    if (status.data?.initialized) navigate('/login', { replace: true })
  }, [navigate, status.data?.initialized])
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })
  const submit = (data: z.infer<typeof schema>) =>
    api('/api/bootstrap', {
      method: 'POST',
      body: JSON.stringify({
        society: { name: data.societyName, address: data.address },
        admin: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
        },
      }),
    })
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((error: Error) =>
        form.setError('root', { message: error.message }),
      )
  if (status.isLoading)
    return (
      <main className="auth-page">
        <p role="status">Checking setup status...</p>
      </main>
    )
  if (status.isError)
    return (
      <main className="auth-page">
        <Feedback message="Unable to check setup status." />
      </main>
    )
  if (status.data?.initialized) return null
  return (
    <main className="auth-page setup-page">
      <p className="eyebrow">INITIALIZATION / 01</p>
      <h1>Set up your society record.</h1>
      <p className="lede">
        Create first administrator access. This is a one-time action.
      </p>
      <form onSubmit={form.handleSubmit(submit)}>
        <FormField
          label="Society name"
          error={form.formState.errors.societyName?.message}
        >
          {(id) => <input id={id} {...form.register('societyName')} />}
        </FormField>
        <FormField
          label="Address"
          error={form.formState.errors.address?.message}
        >
          {(id) => <input id={id} {...form.register('address')} />}
        </FormField>
        <FormField
          label="Administrator name"
          error={form.formState.errors.name?.message}
        >
          {(id) => <input id={id} {...form.register('name')} />}
        </FormField>
        <FormField label="Email" error={form.formState.errors.email?.message}>
          {(id) => <input id={id} type="email" {...form.register('email')} />}
        </FormField>
        <FormField label="Phone" error={form.formState.errors.phone?.message}>
          {(id) => (
            <input
              id={id}
              placeholder="+14155550100"
              {...form.register('phone')}
            />
          )}
        </FormField>
        <FormField
          label="Password"
          error={form.formState.errors.password?.message}
        >
          {(id) => (
            <input id={id} type="password" {...form.register('password')} />
          )}
        </FormField>
        <Feedback message={form.formState.errors.root?.message} />
        <button
          className="primary-button"
          disabled={status.data?.initialized !== false}
        >
          Create society
        </button>
      </form>
    </main>
  )
}
