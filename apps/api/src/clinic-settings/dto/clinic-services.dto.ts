import { IsArray, IsString, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class ServiceDto {
  @IsString()
  id: string

  @IsString()
  title: string

  @IsString()
  description: string

  @IsString()
  duration: string

  @IsString()
  value: string

  @IsOptional()
  @IsString()
  note?: string
}

export class ClinicServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services: ServiceDto[]
}

export class GetClinicServicesResponseDto {
  id: string
  clinicId: string
  services: ServiceDto[]
  createdAt: Date
  updatedAt?: Date
}
