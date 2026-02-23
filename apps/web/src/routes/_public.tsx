import { tokenService } from '@/services/token.service'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_public')({
  beforeLoad: () => {
    // Redirect to dashboard if already authenticated
    if (tokenService.hasValidToken()) {
      const user = tokenService.getUser()
      throw redirect({ to: user?.activeClinic ? '/clinic' : '/admin' })
    }
  },
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  )
}
