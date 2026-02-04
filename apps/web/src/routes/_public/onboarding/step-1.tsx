import { createFileRoute } from '@tanstack/react-router'
import { OnboardingStep1 } from '@/components/onboarding/onboarding-step1'

export const Route = createFileRoute('/_public/onboarding/step-1')({
  component: OnboardingStep1,
})
