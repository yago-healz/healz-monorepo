import type { ReactNode } from 'react'

// Step 1: Clinic Objectives
export interface Priority {
  id: string
  title: string
  description: string
  icon: ReactNode
}

export interface PainPoint {
  id: string
  title: string
  description: string
  icon: ReactNode
  selected: boolean
}

export interface Step1Data {
  priorities: Priority[]
  painPoints: PainPoint[]
  additionalNotes: string
}

// Step 2: Operational Flow
export interface Service {
  id: string
  title: string
  description: string
  duration: string
  value: string
  note?: string
}

// Legacy TimeBlock (used in onboarding step 2)
export interface TimeBlock {
  id: string
  from: string
  to: string
}

// New scheduling types (for clinic settings redesign)
export interface TimeSlot {
  id: string
  from: string // HH:MM
  to: string // HH:MM
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface DaySchedule {
  day: DayOfWeek
  isOpen: boolean
  timeSlots: TimeSlot[]
}

export interface SpecificBlock {
  id: string
  date: string // YYYY-MM-DD
  from: string // HH:MM
  to: string // HH:MM
  reason?: string
}

export interface SchedulingRules {
  weeklySchedule: DaySchedule[]
  defaultAppointmentDuration: number
  minimumAdvanceHours: number
  maxFutureDays: number
  specificBlocks: SpecificBlock[]
}

export interface Step2Data {
  services: Service[]
  timeBlocks: TimeBlock[]
  minimumInterval: number
}

// Step 3: Teaching Carol
export interface PersonalityTrait {
  id: string
  label: string
}

export interface Step3Data {
  selectedTraits: string[]
  greeting: string
  restrictSensitiveTopics: boolean
}

// Step 4: Notifications & Handoff
export interface NotificationSettings {
  newBooking: boolean
  riskOfLoss: boolean
}

export type AlertChannel = 'whatsapp' | 'email'

export interface Step4Data {
  notifications: NotificationSettings
  alertChannel: AlertChannel
  phoneNumber: string
}

// Step 5: WhatsApp Integration
export interface Step5Data {
  inboxName: string
  phoneNumber: string
  businessAccountId: string
  appId: string
  apiToken: string
}

// Complete Onboarding Data
export interface OnboardingData {
  step1: Step1Data
  step2: Step2Data
  step3: Step3Data
  step4: Step4Data
  step5: Step5Data
}

// Progress tracking
export interface OnboardingProgress {
  step: number
  percentage: number
  label: string
}

// Context type
export interface OnboardingContextType {
  data: OnboardingData
  updateStep1: (data: Partial<Step1Data>) => void
  updateStep2: (data: Partial<Step2Data>) => void
  updateStep3: (data: Partial<Step3Data>) => void
  updateStep4: (data: Partial<Step4Data>) => void
  updateStep5: (data: Partial<Step5Data>) => void
  resetData: () => void
  isComplete: boolean
}

// Personality traits constant
export const PERSONALITY_TRAITS: PersonalityTrait[] = [
  { id: 'welcoming', label: 'Acolhedor' },
  { id: 'professional', label: 'Profissional' },
  { id: 'empathetic', label: 'Empático' },
  { id: 'direct', label: 'Direto' },
  { id: 'cheerful', label: 'Alegre' },
  { id: 'calm', label: 'Calmo' },
]

// Re-export clinic settings response types
export type { ClinicObjectivesResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicServicesResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicSchedulingResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicCarolSettingsResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicNotificationsResponse } from '@/features/clinic/api/clinic-settings.api'
