export class DoctorClinicResponseDto {
  id: string
  defaultDuration: number
  notes: string | null
  isActive: boolean
}

export class DoctorProfileResponseDto {
  id: string
  userId: string
  name: string
  email: string
  crm: string | null
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  isActive: boolean
  doctorClinic: DoctorClinicResponseDto
}
