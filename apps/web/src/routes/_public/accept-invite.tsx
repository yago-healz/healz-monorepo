import { AcceptInviteForm } from '@/features/auth/components/accept-invite-form'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const acceptInviteSearchSchema = z.object({
  token: z.string(),
})

export const Route = createFileRoute('/_public/accept-invite')({
  validateSearch: acceptInviteSearchSchema,
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { token } = Route.useSearch()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AcceptInviteForm token={token} />
    </div>
  )
}
