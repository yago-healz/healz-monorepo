import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsIn(['pix', 'credit_card', 'debit_card', 'cash', 'insurance', 'bank_transfer'])
  type?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  instructions?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
