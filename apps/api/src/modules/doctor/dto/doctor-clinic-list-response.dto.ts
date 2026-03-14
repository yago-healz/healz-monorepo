export class DoctorClinicLinkDto {
  id: string
  defaultDuration: number
  notes: string | null
  isActive: boolean
}

export class ClinicForDoctorResponseDto {
  id: string
  name: string
  status: string
  link: DoctorClinicLinkDto
}
