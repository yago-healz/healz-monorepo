import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const resetPasswordSearchSchema = z.object({
  token: z.string(),
})

export const Route = createFileRoute('/_public/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <ResetPasswordForm token={token} />
    </div>
  )
}
