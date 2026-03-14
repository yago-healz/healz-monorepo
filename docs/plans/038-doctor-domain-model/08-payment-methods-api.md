# 08 — Payment Methods API

**Objetivo:** CRUD para formas de pagamento da clínica.

---

## Arquivos a criar

```
apps/api/src/modules/payment-methods/
├── payment-methods.module.ts
├── payment-methods.controller.ts
├── payment-methods.service.ts
└── dto/
    ├── create-payment-method.dto.ts
    └── update-payment-method.dto.ts
```

## Endpoints

| Método | Rota | Descrição | Guard |
|--------|------|-----------|-------|
| `POST` | `/clinics/:clinicId/payment-methods` | Criar forma de pagamento | JwtAuthGuard + IsClinicAdminGuard |
| `GET` | `/clinics/:clinicId/payment-methods` | Listar formas de pagamento | JwtAuthGuard |
| `PATCH` | `/clinics/:clinicId/payment-methods/:id` | Atualizar forma de pagamento | JwtAuthGuard + IsClinicAdminGuard |
| `DELETE` | `/clinics/:clinicId/payment-methods/:id` | Desativar (soft delete) | JwtAuthGuard + IsClinicAdminGuard |

## DTOs

### CreatePaymentMethodDto
```typescript
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
```

### UpdatePaymentMethodDto
```typescript
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
```

## Resposta (GET lista)

```typescript
[
  {
    id: string
    clinicId: string
    type: string
    name: string
    instructions: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date | null
  }
]
```

## Nota

Sem paginação — clínicas terão poucas formas de pagamento (< 10). Retorna array direto.

## Done when

- [ ] Module registrado no AppModule
- [ ] 4 endpoints funcionando
- [ ] Enum de tipo validado
- [ ] Guards aplicados
