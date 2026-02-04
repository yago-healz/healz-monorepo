import { createFileRoute } from '@tanstack/react-router'
import { OnboardingStep4 } from '@/components/onboarding/onboarding-step4'

export const Route = createFileRoute('/_public/onboarding/step-4')({
  component: OnboardingStep4,
})
