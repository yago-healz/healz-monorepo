import { createFileRoute } from '@tanstack/react-router'
import { OnboardingStart } from '@/components/onboarding/onboarding-start'

export const Route = createFileRoute('/_public/onboarding/')({
  component: OnboardingStart,
})
