import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator'

export interface Priority {
  id: string
  title: string
  description: string
}

export interface PainPoint {
  id: string
  title: string
  description: string
  selected: boolean
}

export class ClinicObjectivesDto {
  @IsArray()
  priorities: Priority[]

  @IsArray()
  painPoints: PainPoint[]

  @IsOptional()
  @IsString()
  additionalNotes?: string
}

export class GetClinicObjectivesResponseDto {
  id: string
  clinicId: string
  priorities: Priority[]
  painPoints: PainPoint[]
  additionalNotes?: string
  createdAt: Date
  updatedAt?: Date
}
