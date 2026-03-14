import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export class ListProceduresQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Busca por nome', required: false })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({ description: 'Filtro por categoria', required: false })
  @IsOptional()
  @IsString()
  category?: string

  @ApiProperty({
    description: 'Filtro por status',
    enum: ['active', 'inactive', 'all'],
    default: 'active',
    required: false,
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all' = 'active'
}
