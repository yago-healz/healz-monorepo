# 01 — Criar IsClinicAdminOrSelfDoctorGuard

**Objetivo:** Guard que permite acesso se o usuario e admin/manager da clinica OU se e o proprio doctor cujo perfil esta sendo editado.

## Arquivo

**Criar:** `apps/api/src/common/guards/is-clinic-admin-or-self-doctor.guard.ts`

## Implementacao

```typescript
@Injectable()
export class IsClinicAdminOrSelfDoctorGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const clinicId = request.params.clinicId;
    const doctorId = request.params.doctorId; // doctorProfiles.id

    // 1. Verificar se e admin/manager (mesma logica do IsClinicAdminGuard)
    const adminAccess = await db
      .select()
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, user.userId),
          or(
            and(eq(clinics.organizationId, /* clinic orgId */), eq(userClinicRoles.role, 'admin')),
            and(eq(userClinicRoles.clinicId, clinicId), eq(userClinicRoles.role, 'manager')),
          ),
        ),
      )
      .limit(1);

    if (adminAccess.length > 0) return true;

    // 2. Verificar se o doctorId pertence ao userId do JWT
    if (!doctorId) {
      throw new ForbiddenException('Acesso negado');
    }

    const selfDoctor = await db
      .select({ id: doctorProfiles.id })
      .from(doctorProfiles)
      .where(
        and(
          eq(doctorProfiles.id, doctorId),
          eq(doctorProfiles.userId, user.userId),
        ),
      )
      .limit(1);

    if (selfDoctor.length === 0) {
      throw new ForbiddenException('Voce so pode editar seus proprios dados');
    }

    return true;
  }
}
```

### Detalhes

- Importar `clinics`, `userClinicRoles`, `doctorProfiles` do schema
- Buscar a clinic primeiro para obter `organizationId` (igual ao `IsClinicAdminGuard`)
- Reutilizar o pattern existente: buscar clinic -> verificar admin/manager -> fallback para self-check
- Se nenhuma condicao for atendida, lanca `ForbiddenException`

## Feito quando

- [ ] Guard criado e exportado
- [ ] Compila sem erros (`pnpm exec tsc -b --noEmit` no `apps/api`)
- [ ] Guard permite admin/manager normalmente
- [ ] Guard permite doctor quando `doctorProfiles.userId === jwt.userId`
- [ ] Guard bloqueia doctor tentando editar outro doctor
