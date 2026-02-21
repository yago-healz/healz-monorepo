import { IsArray } from 'class-validator'

export interface Service {
  id: string
  title: string
  description: string
  duration: string
  value: string
  note?: string
}

export class ClinicServicesDto {
  @IsArray()
  services: Service[]
}

export class GetClinicServicesResponseDto {
  id: string
  clinicId: string
  services: Service[]
  createdAt: Date
  updatedAt?: Date
}
