import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!tokenService.hasValidToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
