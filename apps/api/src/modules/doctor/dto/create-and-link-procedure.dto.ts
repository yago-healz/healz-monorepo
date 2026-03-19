import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateAndLinkProcedureDto {
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

  @ApiProperty({ description: 'Preço do procedimento para este médico', required: false })
  @IsOptional()
  @IsNumber()
  price?: number

  @ApiProperty({ description: 'Duração personalizada em minutos para este médico', minimum: 5, maximum: 480, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationOverride?: number
}
