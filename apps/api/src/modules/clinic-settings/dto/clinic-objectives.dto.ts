import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class PriorityDto {
  @IsString()
  id: string

  @IsString()
  title: string

  @IsString()
  description: string
}

export class PainPointDto {
  @IsString()
  id: string

  @IsString()
  title: string

  @IsString()
  description: string

  @IsBoolean()
  selected: boolean
}

export class ClinicObjectivesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriorityDto)
  priorities: PriorityDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PainPointDto)
  painPoints: PainPointDto[]

  @IsOptional()
  @IsString()
  additionalNotes?: string
}

export class GetClinicObjectivesResponseDto {
  id: string
  clinicId: string
  priorities: PriorityDto[]
  painPoints: PainPointDto[]
  additionalNotes?: string
  createdAt: Date
  updatedAt?: Date
}
