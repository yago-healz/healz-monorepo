# 04 — Doctor Clinics API

**Objetivo:** Endpoints para gerenciar o vínculo médico ↔ clínica (entidade central do modelo).

---

## Nota

A criação e listagem de vínculos já é coberta pelo `POST /clinics/:clinicId/doctors` e `GET /clinics/:clinicId/doctors` (tarefa 03). Esta tarefa cobre operações adicionais sobre o vínculo.

## Endpoints adicionais

| Método | Rota | Descrição | Guard |
|--------|------|-----------|-------|
| `PATCH` | `/clinics/:clinicId/doctors/:doctorId/link` | Atualizar vínculo (defaultDuration, notes) | JwtAuthGuard + IsClinicAdminGuard |
| `GET` | `/doctors/:doctorId/clinics` | Listar clínicas onde o médico atua (útil para médicos multi-clínica) | JwtAuthGuard |

## DTOs

### UpdateDoctorClinicDto
```typescript
export class UpdateDoctorClinicDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDuration?: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
```

## Lógica

- `PATCH /link`: Atualiza campos em `doctor_clinics` (defaultDuration, notes, isActive).
- `GET /doctors/:doctorId/clinics`: Query `doctor_clinics` JOIN `clinics` WHERE `doctorId` = param. Retorna lista de clínicas com dados do vínculo. Só retorna clínicas que o user autenticado tem acesso (via clinicAccess no JWT).

## Done when

- [ ] Endpoints funcionando
- [ ] Validação de que o médico pertence à clínica
- [ ] Filtro de acesso baseado no JWT
