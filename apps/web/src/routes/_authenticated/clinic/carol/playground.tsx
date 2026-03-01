import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/clinic/carol/playground')({
  beforeLoad: () => {
    throw redirect({ to: '/clinic/carol/settings' })
  },
})
