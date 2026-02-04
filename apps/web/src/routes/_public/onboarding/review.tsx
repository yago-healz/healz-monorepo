import { createFileRoute } from '@tanstack/react-router'
import { OnboardingReview } from '@/components/onboarding/onboarding-review'

export const Route = createFileRoute('/_public/onboarding/review')({
  component: OnboardingReview,
})
