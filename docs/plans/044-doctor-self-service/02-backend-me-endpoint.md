# 02 — Endpoint GET /doctors/me

**Objetivo:** Permitir que o doctor logado descubra seu proprio `doctorId` (doctorProfiles.id) na clinica ativa.

## Arquivos

**Modificar:**
- `apps/api/src/modules/doctor/doctor.controller.ts` — adicionar rota `GET me`
- `apps/api/src/modules/doctor/doctor.service.ts` — adicionar metodo `findByUserId`

## Implementacao

### Service: `findByUserId(clinicId, userId)`

```typescript
async findByUserId(clinicId: string, userId: string): Promise<DoctorProfileResponseDto> {
  const rows = await db
    .select({
      profileId: doctorProfiles.id,
      userId: doctorProfiles.userId,
      crm: doctorProfiles.crm,
      specialty: doctorProfiles.specialty,
      bio: doctorProfiles.bio,
      photoUrl: doctorProfiles.photoUrl,
      profileIsActive: doctorProfiles.isActive,
      userName: users.name,
      userEmail: users.email,
      linkId: doctorClinics.id,
      defaultDuration: doctorClinics.defaultDuration,
      notes: doctorClinics.notes,
      linkIsActive: doctorClinics.isActive,
    })
    .from(doctorClinics)
    .innerJoin(doctorProfiles, eq(doctorClinics.doctorId, doctorProfiles.userId))
    .innerJoin(users, eq(doctorProfiles.userId, users.id))
    .where(
      and(
        eq(doctorClinics.clinicId, clinicId),
        eq(doctorProfiles.userId, userId),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    throw new NotFoundException('Perfil medico nao encontrado para este usuario nesta clinica');
  }

  // Reutilizar o mesmo mapeamento de findOne/findAll
  const row = rows[0];
  return {
    id: row.profileId,
    userId: row.userId,
    name: row.userName,
    email: row.userEmail,
    crm: row.crm,
    specialty: row.specialty,
    bio: row.bio,
    photoUrl: row.photoUrl,
    isActive: row.profileIsActive,
    doctorClinic: {
      id: row.linkId,
      defaultDuration: row.defaultDuration,
      notes: row.notes,
      isActive: row.linkIsActive,
    },
  };
}
```

### Controller: rota `GET me`

```typescript
@Get('me')
@ApiOperation({ summary: 'Obter perfil do medico logado nesta clinica' })
getMe(@Param('clinicId') clinicId: string, @Req() req: Request) {
  const user = req.user as JwtPayload;
  return this.doctorService.findByUserId(clinicId, user.userId);
}
```

**IMPORTANTE:** A rota `GET me` DEVE ser declarada ANTES de `GET :doctorId` no controller, senao o NestJS interpreta "me" como um `doctorId`.

### Interface JwtPayload

Verificar que `JwtPayload` ja tem `userId`. Arquivo: `apps/api/src/common/interfaces/jwt-payload.interface.ts`

## Feito quando

- [ ] `GET /clinics/:clinicId/doctors/me` retorna o perfil do doctor logado
- [ ] Retorna 404 se o usuario nao e doctor nessa clinica
- [ ] Retorna o mesmo formato de `DoctorProfileResponseDto` (compativel com `useDoctor`)
- [ ] Rota declarada antes de `:doctorId` no controller
