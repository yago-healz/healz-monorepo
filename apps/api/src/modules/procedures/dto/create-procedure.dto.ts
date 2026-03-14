import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateProcedureDto {
  @ApiProperty({ description: 'Nome do procedimento', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string

  @ApiProperty({ description: 'Descrição do procedimento', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: 'Categoria do procedimento', maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @ApiProperty({ description: 'Duração padrão em minutos', minimum: 5, maximum: 480 })
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDuration: number
}
