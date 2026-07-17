import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLogin } from './auth-api'
import { FormField } from '../../components/FormField'
import { Feedback } from '../../components/Feedback'
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
type Form = z.infer<typeof schema>
export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const login = useLogin()
  const form = useForm<Form>({ resolver: zodResolver(schema) })
  const submit = (data: Form) =>
    login.mutate(data, {
      onSuccess: () => {
        const target = params.get('returnTo')
        navigate(
          target?.startsWith('/') && !target.startsWith('//')
            ? target
            : '/dashboard',
          { replace: true },
        )
      },
    })
  return (
    <main className="auth-page">
      <p className="eyebrow">ACCESS / 01</p>
      <h1>Sign in to the work record.</h1>
      <p className="lede">Use your registered email and password.</p>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormField label="Email" error={form.formState.errors.email?.message}>
          {(id) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
          )}
        </FormField>
        <FormField
          label="Password"
          error={form.formState.errors.password?.message}
        >
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          )}
        </FormField>
        <Feedback
          message={
            login.error instanceof Error ? login.error.message : undefined
          }
        />
        <button className="primary-button" disabled={login.isPending}>
          {login.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="utility-note">
        Need to initialize this society? <a href="/setup">Start setup</a>.
      </p>
    </main>
  )
}
