# 07 — Doctor Clinic Schedules API

**Objetivo:** CRUD para agenda do médico por clínica (mesma estrutura do clinic_scheduling existente, mas no nível médico/clínica).

---

## Endpoints

| Método | Rota | Descrição | Guard |
|--------|------|-----------|-------|
| `GET` | `/clinics/:clinicId/doctors/:doctorId/schedule` | Obter agenda do médico na clínica | JwtAuthGuard |
| `PATCH` | `/clinics/:clinicId/doctors/:doctorId/schedule` | Salvar/atualizar agenda | JwtAuthGuard + IsClinicAdminGuard |

## DTOs

Reutilizar os DTOs existentes de scheduling (`TimeSlotDto`, `DayScheduleDto`, `SpecificBlockDto`), importando de um local compartilhado ou replicando no módulo doctor.

### DoctorScheduleDto
```typescript
export class DoctorScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[]

  @IsInt()
  @Min(1)
  defaultAppointmentDuration: number

  @IsInt()
  @Min(0)
  minimumAdvanceHours: number

  @IsInt()
  @Min(1)
  maxFutureDays: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificBlockDto)
  specificBlocks: SpecificBlockDto[]
}
```

## Lógica

- `GET`: Busca `doctor_clinic_schedules` via `doctorClinicId`. Se não existe, retorna valores default (weeklySchedule vazio, durations da clinic_scheduling como fallback).
- `PATCH`: Upsert em `doctor_clinic_schedules` (mesmo padrão de `clinic-settings.service.ts`). Busca `doctor_clinics.id` via (doctorId, clinicId).

## Resposta (GET)

```typescript
{
  id: string | null              // null se ainda não configurou
  doctorClinicId: string
  weeklySchedule: DayScheduleDto[]
  specificBlocks: SpecificBlockDto[]
  defaultAppointmentDuration: number
  minimumAdvanceHours: number
  maxFutureDays: number
  createdAt: Date | null
  updatedAt: Date | null
}
```

## Done when

- [ ] GET retorna agenda ou defaults
- [ ] PATCH faz upsert corretamente
- [ ] Mesma estrutura de weeklySchedule/specificBlocks do clinic_scheduling
- [ ] Validação: doctor_clinic existe
