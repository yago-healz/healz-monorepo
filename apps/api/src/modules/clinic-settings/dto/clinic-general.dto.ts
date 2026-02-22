import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator'
import { Type } from 'class-transformer'

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string

  @IsString()
  @IsNotEmpty()
  number: string

  @IsOptional()
  @IsString()
  complement?: string

  @IsOptional()
  @IsString()
  neighborhood?: string

  @IsString()
  @IsNotEmpty()
  city: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  state: string

  @IsString()
  @IsNotEmpty()
  zipCode: string

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string
}

export class ClinicGeneralDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto
}

export class GetClinicGeneralResponseDto {
  id: string
  name: string
  description?: string | null
  address?: {
    id: string
    street: string
    number: string
    complement?: string | null
    neighborhood?: string | null
    city: string
    state: string
    zipCode: string
    country: string
    createdAt: Date
    updatedAt?: Date | null
  } | null
}
