import { createFileRoute } from '@tanstack/react-router'
import { OnboardingComplete } from '@/components/onboarding/onboarding-complete'

export const Route = createFileRoute('/_public/onboarding/complete')({
  component: OnboardingComplete,
})
