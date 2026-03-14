import { IsOptional, IsNumber, IsInt, IsBoolean, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateDoctorProcedureDto {
  @ApiPropertyOptional({ description: 'Preço cobrado por este médico' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number

  @ApiPropertyOptional({ description: 'Duração em minutos (null = usa defaultDuration do procedimento)' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationOverride?: number

  @ApiPropertyOptional({ description: 'Se o procedimento está ativo para este médico' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
