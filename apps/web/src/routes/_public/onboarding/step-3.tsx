import { createFileRoute } from '@tanstack/react-router'
import { OnboardingStep3 } from '@/components/onboarding/onboarding-step3'

export const Route = createFileRoute('/_public/onboarding/step-3')({
  component: OnboardingStep3,
})
