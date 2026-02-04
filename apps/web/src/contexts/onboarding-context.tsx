import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type {
  OnboardingData,
  OnboardingContextType,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
} from '@/types/onboarding'

const STORAGE_KEY = 'healz-onboarding-draft'

// Default data structure
const getDefaultData = (): OnboardingData => ({
  step1: {
    priorities: [],
    painPoints: [],
    additionalNotes: '',
  },
  step2: {
    services: [],
    timeBlocks: [],
    minimumInterval: 15,
  },
  step3: {
    selectedTraits: ['welcoming', 'empathetic'],
    greeting:
      "Hi! I'm Carol, your virtual assistant. I'm here to help you schedule appointments, answer questions about our services, or route you to a specialist. How can I help you today?",
    restrictSensitiveTopics: true,
  },
  step4: {
    notifications: {
      newBooking: true,
      riskOfLoss: true,
    },
    alertChannel: 'whatsapp',
    phoneNumber: '',
  },
  step5: {
    inboxName: '',
    phoneNumber: '',
    businessAccountId: '',
    appId: '',
    apiToken: '',
  },
})

// Load data from localStorage
const loadFromStorage = (): OnboardingData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load onboarding data from localStorage:', error)
  }
  return getDefaultData()
}

// Save data to localStorage
const saveToStorage = (data: OnboardingData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save onboarding data to localStorage:', error)
  }
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(getDefaultData)

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedData = loadFromStorage()
    setData(loadedData)
  }, [])

  // Auto-save to localStorage whenever data changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToStorage(data)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [data])

  const updateStep1 = (updates: Partial<Step1Data>) => {
    setData((prev) => ({
      ...prev,
      step1: { ...prev.step1, ...updates },
    }))
  }

  const updateStep2 = (updates: Partial<Step2Data>) => {
    setData((prev) => ({
      ...prev,
      step2: { ...prev.step2, ...updates },
    }))
  }

  const updateStep3 = (updates: Partial<Step3Data>) => {
    setData((prev) => ({
      ...prev,
      step3: { ...prev.step3, ...updates },
    }))
  }

  const updateStep4 = (updates: Partial<Step4Data>) => {
    setData((prev) => ({
      ...prev,
      step4: { ...prev.step4, ...updates },
    }))
  }

  const updateStep5 = (updates: Partial<Step5Data>) => {
    setData((prev) => ({
      ...prev,
      step5: { ...prev.step5, ...updates },
    }))
  }

  const resetData = () => {
    const defaultData = getDefaultData()
    setData(defaultData)
    localStorage.removeItem(STORAGE_KEY)
  }

  // Check if onboarding is complete (all required fields filled)
  const isComplete =
    data.step1.priorities.length > 0 &&
    data.step4.phoneNumber.trim() !== '' &&
    data.step5.appId.trim() !== '' &&
    data.step5.apiToken.trim() !== ''

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateStep1,
        updateStep2,
        updateStep3,
        updateStep4,
        updateStep5,
        resetData,
        isComplete,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
