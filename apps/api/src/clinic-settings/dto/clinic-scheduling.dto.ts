import { IsArray, IsInt, Min } from 'class-validator'

export interface TimeBlock {
  id: string
  from: string // HH:MM
  to: string // HH:MM
}

export class ClinicSchedulingDto {
  @IsArray()
  timeBlocks: TimeBlock[]

  @IsInt()
  @Min(0)
  minimumInterval: number
}

export class GetClinicSchedulingResponseDto {
  id: string
  clinicId: string
  timeBlocks: TimeBlock[]
  minimumInterval: number
  createdAt: Date
  updatedAt?: Date
}
