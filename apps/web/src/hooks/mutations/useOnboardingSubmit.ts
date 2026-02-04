import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { apiClient } from '@/lib/api/client'
import type { OnboardingData } from '@/types/onboarding'

interface OnboardingSubmitResponse {
  id: string
  status: 'activated' | 'pending'
  message: string
}

export function useOnboardingSubmit() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (data: OnboardingData) => {
      return apiClient<OnboardingSubmitResponse>('/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      // Clear localStorage draft after successful submission
      localStorage.removeItem('healz-onboarding-draft')

      // Navigate to complete screen
      navigate({ to: '/onboarding/complete' })
    },
    onError: (error) => {
      console.error('Failed to submit onboarding:', error)
      // Error handling is done via the mutation's isError state in the component
    },
  })
}
