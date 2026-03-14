export type PaymentMethodType = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'insurance' | 'bank_transfer'

export interface PaymentMethod {
  id: string
  clinicId: string
  type: PaymentMethodType
  name: string
  instructions: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreatePaymentMethodDto {
  type: PaymentMethodType
  name: string
  instructions?: string
}

export interface UpdatePaymentMethodDto {
  type?: PaymentMethodType
  name?: string
  instructions?: string
  isActive?: boolean
}
