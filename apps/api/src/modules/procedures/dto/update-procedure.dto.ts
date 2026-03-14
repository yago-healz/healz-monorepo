import { ApiProperty } from '@nestjs/swagger'
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class UpdateProcedureDto {
  @ApiProperty({ description: 'Nome do procedimento', maxLength: 255, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string

  @ApiProperty({ description: 'Descrição do procedimento', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: 'Categoria do procedimento', maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @ApiProperty({ description: 'Duração padrão em minutos', minimum: 5, maximum: 480, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDuration?: number

  @ApiProperty({ description: 'Status ativo/inativo', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
