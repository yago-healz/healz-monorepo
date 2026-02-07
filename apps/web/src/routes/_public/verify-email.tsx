import { VerifyEmail } from '@/features/auth/components/verify-email'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const verifyEmailSearchSchema = z.object({
  token: z.string(),
})

export const Route = createFileRoute('/_public/verify-email')({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token } = Route.useSearch()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <VerifyEmail token={token} />
    </div>
  )
}
