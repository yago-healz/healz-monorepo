import { OnboardingProvider } from '@/contexts/onboarding-context'
import { tokenService } from '@/services/token.service'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_public')({
  beforeLoad: () => {
    // Redirect to dashboard if already authenticated
    if (tokenService.hasValidToken()) {
      throw redirect({ to: '/admin' })
    }
  },
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    </OnboardingProvider>
  )
}
