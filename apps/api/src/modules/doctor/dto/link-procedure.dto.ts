import { IsUUID, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LinkProcedureDto {
  @ApiProperty({ description: 'ID do procedimento a vincular' })
  @IsUUID()
  procedureId: string

  @ApiPropertyOptional({ description: 'Preço cobrado por este médico (null = sem preço definido)' })
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
}
