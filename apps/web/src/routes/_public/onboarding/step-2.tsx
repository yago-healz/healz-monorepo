import { createFileRoute } from '@tanstack/react-router'
import { OnboardingStep2 } from '@/components/onboarding/onboarding-step2'

export const Route = createFileRoute('/_public/onboarding/step-2')({
  component: OnboardingStep2,
})
