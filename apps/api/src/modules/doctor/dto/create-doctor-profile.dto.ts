import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateDoctorProfileDto {
  @ApiProperty({ description: 'ID do usuário com role doctor' })
  @IsUUID()
  userId: string

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  crm?: string

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string
}
