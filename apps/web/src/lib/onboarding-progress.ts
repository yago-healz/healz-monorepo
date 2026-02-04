import type { OnboardingProgress } from '@/types/onboarding'

export function calculateProgress(path: string): OnboardingProgress {
  const steps: Record<string, OnboardingProgress> = {
    '/onboarding': { step: 0, percentage: 0, label: 'Start' },
    '/onboarding/': { step: 0, percentage: 0, label: 'Start' },
    '/onboarding/step-1': { step: 1, percentage: 20, label: 'Clinic Objectives' },
    '/onboarding/step-2': { step: 2, percentage: 40, label: 'Operational Flow' },
    '/onboarding/step-3': { step: 3, percentage: 60, label: 'Teaching Carol' },
    '/onboarding/step-4': { step: 4, percentage: 80, label: 'Notifications' },
    '/onboarding/step-5': { step: 5, percentage: 95, label: 'WhatsApp' },
    '/onboarding/review': { step: 6, percentage: 98, label: 'Review' },
    '/onboarding/complete': { step: 7, percentage: 100, label: 'Complete' },
  }

  return steps[path] || steps['/onboarding']
}

export function getStepLabel(step: number): string {
  const labels = [
    'Start',
    'Clinic Objectives',
    'Operational Flow',
    'Teaching Carol',
    'Notifications',
    'WhatsApp Integration',
    'Review',
    'Complete',
  ]
  return labels[step] || 'Unknown'
}
