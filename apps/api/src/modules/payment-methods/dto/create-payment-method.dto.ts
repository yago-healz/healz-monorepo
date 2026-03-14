import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreatePaymentMethodDto {
  @IsIn(['pix', 'credit_card', 'debit_card', 'cash', 'insurance', 'bank_transfer'])
  type: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  instructions?: string
}
