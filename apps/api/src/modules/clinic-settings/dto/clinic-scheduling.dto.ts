import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class TimeBlockDto {
  @IsString()
  id: string

  @IsString()
  from: string // HH:MM

  @IsString()
  to: string // HH:MM
}

export class ClinicSchedulingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeBlockDto)
  timeBlocks: TimeBlockDto[]

  @IsInt()
  @Min(0)
  minimumInterval: number
}

export class GetClinicSchedulingResponseDto {
  id: string
  clinicId: string
  timeBlocks: TimeBlockDto[]
  minimumInterval: number
  createdAt: Date
  updatedAt?: Date
}
