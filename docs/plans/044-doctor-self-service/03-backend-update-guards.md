# 03 — Trocar Guards nos Endpoints de Escrita do Doctor

**Objetivo:** Substituir `IsClinicAdminGuard` por `IsClinicAdminOrSelfDoctorGuard` nos endpoints que o doctor deve poder usar para editar seus proprios dados.

**Depende de:** 01 (guard criado)

## Arquivo

**Modificar:** `apps/api/src/modules/doctor/doctor.controller.ts`

## Endpoints a atualizar

| Endpoint | Guard Atual | Guard Novo | Notas |
|----------|-------------|------------|-------|
| `PATCH :doctorId` (update profile) | `IsClinicAdminGuard` | `IsClinicAdminOrSelfDoctorGuard` | Doctor edita CRM, specialty, bio |
| `PATCH :doctorId/link` (update link) | `IsClinicAdminGuard` | `IsClinicAdminOrSelfDoctorGuard` | Doctor edita defaultDuration, notes. **NAO** pode editar `isActive` (ver abaixo) |
| `PATCH :doctorId/schedule` (save schedule) | `IsClinicAdminGuard` | `IsClinicAdminOrSelfDoctorGuard` | Doctor configura sua agenda |

## Endpoints que NAO mudam

| Endpoint | Mantém Guard | Razao |
|----------|-------------|-------|
| `POST` (create doctor) | `IsClinicAdminGuard` | Apenas admin/manager cria doctors |
| `DELETE :doctorId` (deactivate) | `IsClinicAdminGuard` | Doctor nao pode se desativar |

## Endpoints de procedures (controller separado)

**Modificar:** `apps/api/src/modules/doctor/doctor-clinic-procedures.controller.ts`

| Endpoint | Guard Novo |
|----------|------------|
| `POST :doctorId/procedures` (link) | `IsClinicAdminOrSelfDoctorGuard` |
| `PATCH :doctorId/procedures/:procedureId` (update) | `IsClinicAdminOrSelfDoctorGuard` |
| `DELETE :doctorId/procedures/:procedureId` (unlink) | `IsClinicAdminOrSelfDoctorGuard` |

## Restricao no updateLink para doctors

O doctor NAO deve poder alterar `isActive` no seu vinculo (desativar a si mesmo). Opcoes:

**Opcao A (recomendada):** No `DoctorService.updateLink`, verificar se quem faz a request e doctor. Se for, ignorar `dto.isActive`. Isso requer passar `userId` do JWT para o service.

**Opcao B:** Tratar no frontend (nao mostrar o switch). Menos seguro, mas mais simples se a restricao de UX e suficiente.

**Implementacao da Opcao A:**

```typescript
// doctor.controller.ts
@Patch(':doctorId/link')
@UseGuards(IsClinicAdminOrSelfDoctorGuard)
updateLink(
  @Param('clinicId') clinicId: string,
  @Param('doctorId') doctorId: string,
  @Body() dto: UpdateDoctorClinicDto,
  @Req() req: Request,
) {
  const user = req.user as JwtPayload;
  return this.doctorService.updateLink(clinicId, doctorId, dto, user.userId);
}

// doctor.service.ts - updateLink
async updateLink(clinicId, doctorId, dto, requestingUserId?) {
  const doctor = await this.findOne(clinicId, doctorId);

  // Se quem esta editando e o proprio doctor, ignorar isActive
  const isSelf = doctor.userId === requestingUserId;
  const updateData = {
    ...(dto.defaultDuration !== undefined && { defaultDuration: dto.defaultDuration }),
    ...(dto.notes !== undefined && { notes: dto.notes }),
    ...(!isSelf && dto.isActive !== undefined && { isActive: dto.isActive }),
    updatedAt: new Date(),
  };

  await db.update(doctorClinics).set(updateData).where(/* ... */);
  return this.findOne(clinicId, doctorId);
}
```

## Feito quando

- [ ] `PATCH :doctorId`, `PATCH :doctorId/link`, `PATCH :doctorId/schedule` usam o novo guard
- [ ] Endpoints de procedures do doctor usam o novo guard
- [ ] Doctor consegue editar seu proprio perfil (testar com curl/Swagger)
- [ ] Doctor NAO consegue editar perfil de outro doctor (403)
- [ ] Doctor NAO consegue desativar seu vinculo (`isActive` ignorado)
- [ ] Manager/Admin continuam com acesso total (sem regressao)
