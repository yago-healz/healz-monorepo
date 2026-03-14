import { IsOptional, IsInt, IsString, IsBoolean, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateDoctorClinicDto {
  @ApiPropertyOptional({ minimum: 5, maximum: 480 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDuration?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
