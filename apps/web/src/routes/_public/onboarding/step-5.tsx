import { createFileRoute } from '@tanstack/react-router'
import { OnboardingStep5 } from '@/components/onboarding/onboarding-step5'

export const Route = createFileRoute('/_public/onboarding/step-5')({
  component: OnboardingStep5,
})
