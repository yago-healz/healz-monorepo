import { Outlet, createFileRoute } from '@tanstack/react-router'
import { OnboardingProvider } from '@/contexts/onboarding-context'

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <OnboardingProvider>
      <Outlet />
    </OnboardingProvider>
  )
}
