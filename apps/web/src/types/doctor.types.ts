// === Doctor Profile ===

export interface DoctorClinicLink {
  id: string
  defaultDuration: number
  notes: string | null
  isActive: boolean
}

export interface DoctorProfile {
  id: string
  userId: string
  name: string
  email: string
  crm: string | null
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  isActive: boolean
  doctorClinic: DoctorClinicLink
}

export interface CreateDoctorProfileDto {
  userId: string
  crm?: string
  specialty?: string
  bio?: string
  photoUrl?: string
}

export interface UpdateDoctorProfileDto {
  crm?: string
  specialty?: string
  bio?: string
  photoUrl?: string
  isActive?: boolean
}

export interface UpdateDoctorClinicDto {
  defaultDuration?: number
  notes?: string
  isActive?: boolean
}

// === Doctor Schedule ===

export interface DoctorTimeSlot {
  id: string
  from: string  // HH:MM
  to: string    // HH:MM
}

export interface DoctorDaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  isOpen: boolean
  timeSlots: DoctorTimeSlot[]
}

export interface DoctorSpecificBlock {
  id: string
  date: string  // YYYY-MM-DD
  from: string  // HH:MM
  to: string    // HH:MM
  reason?: string
}

export interface DoctorSchedule {
  id: string | null
  doctorClinicId: string
  weeklySchedule: DoctorDaySchedule[]
  specificBlocks: DoctorSpecificBlock[]
  defaultAppointmentDuration: number
  minimumAdvanceHours: number
  maxFutureDays: number
  createdAt: string | null
  updatedAt: string | null
}

export interface SaveDoctorScheduleDto {
  weeklySchedule: DoctorDaySchedule[]
  defaultAppointmentDuration: number
  minimumAdvanceHours: number
  maxFutureDays: number
  specificBlocks: DoctorSpecificBlock[]
}

// === Doctor Procedures ===

export interface DoctorProcedure {
  id: string
  procedureId: string
  procedureName: string
  procedureCategory: string | null
  procedureDefaultDuration: number
  price: number | null
  durationOverride: number | null
  effectiveDuration: number
  isActive: boolean
}

export interface LinkDoctorProcedureDto {
  procedureId: string
  price?: number
  durationOverride?: number
}

export interface UpdateDoctorProcedureDto {
  price?: number
  durationOverride?: number
  isActive?: boolean
}

export interface CreateAndLinkProcedureDto {
  name: string
  description?: string
  category?: string
  defaultDuration: number
  price?: number
  durationOverride?: number
}

// === Clinics for Doctor ===

export interface ClinicForDoctor {
  id: string
  name: string
  status: string
  link: DoctorClinicLink
}
