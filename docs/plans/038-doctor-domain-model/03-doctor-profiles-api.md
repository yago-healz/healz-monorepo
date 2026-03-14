# 03 — Doctor Profiles API

**Objetivo:** CRUD para perfil médico (1:1 com users).

---

## Arquivos a criar

```
apps/api/src/modules/doctor/
├── doctor.module.ts
├── doctor.controller.ts
├── doctor.service.ts
└── dto/
    ├── create-doctor-profile.dto.ts
    ├── update-doctor-profile.dto.ts
    └── doctor-profile-response.dto.ts
```

## Endpoints

| Método | Rota | Descrição | Guard |
|--------|------|-----------|-------|
| `POST` | `/clinics/:clinicId/doctors` | Criar perfil médico para um user existente | JwtAuthGuard + IsClinicAdminGuard |
| `GET` | `/clinics/:clinicId/doctors` | Listar médicos da clínica (via doctor_clinics + doctor_profiles) | JwtAuthGuard |
| `GET` | `/clinics/:clinicId/doctors/:doctorId` | Detalhe de um médico (perfil + vínculo) | JwtAuthGuard |
| `PATCH` | `/clinics/:clinicId/doctors/:doctorId` | Atualizar perfil do médico | JwtAuthGuard + IsClinicAdminGuard |
| `DELETE` | `/clinics/:clinicId/doctors/:doctorId` | Desativar perfil (soft delete: isActive=false) | JwtAuthGuard + IsClinicAdminGuard |

## DTOs

### CreateDoctorProfileDto
```typescript
export class CreateDoctorProfileDto {
  @IsUUID()
  userId: string            // user existente com role "doctor"

  @IsOptional()
  @IsString()
  @MaxLength(50)
  crm?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string

  @IsOptional()
  @IsString()
  bio?: string

  @IsOptional()
  @IsString()
  photoUrl?: string
}
```

### UpdateDoctorProfileDto
```typescript
export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  crm?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string

  @IsOptional()
  @IsString()
  bio?: string

  @IsOptional()
  @IsString()
  photoUrl?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
```

## Lógica de negócio

- `POST /doctors`: Verifica se user existe e tem role "doctor" na clínica via `userClinicRoles`. Cria `doctor_profiles` (se não existe) + `doctor_clinics` (vínculo com a clínica).
- `GET /doctors`: Faz JOIN entre `doctor_clinics` + `doctor_profiles` + `users` (name, email) filtrando por `clinicId`.
- `GET /doctors/:doctorId`: Retorna perfil completo com dados do user.
- `PATCH /doctors/:doctorId`: Atualiza campos do `doctor_profiles`.
- `DELETE /doctors/:doctorId`: Seta `isActive=false` no `doctor_clinics` (não deleta).

## Resposta padrão (GET)

```typescript
{
  id: string           // doctor_profiles.id
  userId: string
  name: string         // from users
  email: string        // from users
  crm: string | null
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  isActive: boolean
  doctorClinic: {
    id: string         // doctor_clinics.id
    defaultDuration: number
    notes: string | null
    isActive: boolean
  }
}
```

## Done when

- [ ] Module registrado no AppModule
- [ ] Todos os 5 endpoints funcionando
- [ ] Validações nos DTOs
- [ ] Guards aplicados
- [ ] Sem erros de TypeScript
