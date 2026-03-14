# 06 — Doctor Clinic Procedures API

**Objetivo:** CRUD para vincular procedimentos a um médico numa clínica, com preço e duração específicos.

---

## Endpoints

Todos dentro do controller de doctor (módulo doctor).

| Método | Rota | Descrição | Guard |
|--------|------|-----------|-------|
| `POST` | `/clinics/:clinicId/doctors/:doctorId/procedures` | Vincular procedimento ao médico | JwtAuthGuard + IsClinicAdminGuard |
| `GET` | `/clinics/:clinicId/doctors/:doctorId/procedures` | Listar procedimentos do médico na clínica | JwtAuthGuard |
| `PATCH` | `/clinics/:clinicId/doctors/:doctorId/procedures/:procedureId` | Atualizar preço/duração | JwtAuthGuard + IsClinicAdminGuard |
| `DELETE` | `/clinics/:clinicId/doctors/:doctorId/procedures/:procedureId` | Desvincular procedimento (soft delete) | JwtAuthGuard + IsClinicAdminGuard |

## DTOs

### LinkProcedureDto
```typescript
export class LinkProcedureDto {
  @IsUUID()
  procedureId: string

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationOverride?: number
}
```

### UpdateDoctorProcedureDto
```typescript
export class UpdateDoctorProcedureDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationOverride?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
```

## Lógica

- `POST`: Busca `doctor_clinics.id` via (doctorId, clinicId). Valida que `procedureId` pertence à mesma clínica. Insere em `doctor_clinic_procedures`.
- `GET`: JOIN `doctor_clinic_procedures` + `procedures` via `doctorClinicId`. Retorna lista com dados do procedimento + preço/duração do médico.
- `PATCH`: Atualiza price, durationOverride ou isActive.
- `DELETE`: Seta `isActive=false`.

## Resposta (GET lista)

```typescript
[
  {
    id: string                    // doctor_clinic_procedures.id
    procedureId: string
    procedureName: string         // from procedures
    procedureCategory: string | null
    procedureDefaultDuration: number
    price: number | null
    durationOverride: number | null
    effectiveDuration: number     // durationOverride ?? procedureDefaultDuration
    isActive: boolean
  }
]
```

## Done when

- [ ] 4 endpoints funcionando
- [ ] Validação: procedimento pertence à mesma clínica
- [ ] Validação: doctor_clinic existe
- [ ] `effectiveDuration` calculado no response
