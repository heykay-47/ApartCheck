import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useChangePassword } from './auth-api'
import { FormField } from '../../components/FormField'
import { Feedback } from '../../components/Feedback'
const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12, 'Use at least 12 characters.'),
})
export function ChangePasswordPage() {
  const navigate = useNavigate()
  const mutation = useChangePassword()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })
  return (
    <main className="auth-page">
      <p className="eyebrow">SECURITY / REQUIRED</p>
      <h1>Replace temporary access.</h1>
      <p className="lede">
        Set a private password before returning to the ledger.
      </p>
      <form
        onSubmit={form.handleSubmit((data) =>
          mutation.mutate(data, {
            onSuccess: () => navigate('/dashboard', { replace: true }),
          }),
        )}
      >
        <FormField
          label="Current password"
          error={form.formState.errors.currentPassword?.message}
        >
          {(id) => (
            <input
              id={id}
              type="password"
              {...form.register('currentPassword')}
            />
          )}
        </FormField>
        <FormField
          label="New password"
          error={form.formState.errors.newPassword?.message}
        >
          {(id) => (
            <input id={id} type="password" {...form.register('newPassword')} />
          )}
        </FormField>
        <Feedback
          message={
            mutation.error instanceof Error ? mutation.error.message : undefined
          }
        />
        <button className="primary-button">Save password</button>
      </form>
    </main>
  )
}
