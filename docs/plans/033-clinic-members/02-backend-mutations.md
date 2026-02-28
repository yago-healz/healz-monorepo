# Tarefa 02 — Backend: DELETE, PATCH e resend-invite

**Objetivo:** Criar os 3 endpoints de mutação de membros — remoção, atualização de cargo e reenvio de convite.

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| CRIAR | `apps/api/src/modules/clinics/dto/update-member-role.dto.ts` |
| CRIAR | `apps/api/src/modules/clinics/dto/resend-invite.dto.ts` |
| MODIFICAR | `apps/api/src/modules/clinics/clinics.service.ts` |
| MODIFICAR | `apps/api/src/modules/clinics/clinics.controller.ts` |

---

## 1. DTO: `update-member-role.dto.ts`

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ["admin", "manager", "doctor", "receptionist", "viewer"] })
  @IsNotEmpty()
  @IsEnum(["admin", "manager", "doctor", "receptionist", "viewer"])
  role: string;
}
```

---

## 2. DTO: `resend-invite.dto.ts`

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendInviteDto {
  @ApiProperty({ example: "usuario@example.com" })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
```

---

## 3. Service: métodos a adicionar em `clinics.service.ts`

### `removeMember(clinicId, requestingUserId, targetUserId)`

```typescript
async removeMember(clinicId: string, requestingUserId: string, targetUserId: string) {
  // 1. Impedir auto-remoção
  if (requestingUserId === targetUserId) {
    throw new BadRequestException("Você não pode remover a si mesmo");
  }

  // 2. Buscar membro alvo
  const member = await db.select().from(userClinicRoles)
    .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)))
    .limit(1);
  if (member.length === 0) throw new NotFoundException("Membro não encontrado");

  // 3. Se for admin, verificar se há outro admin
  if (member[0].role === "admin") {
    const adminCount = await db.select({ count: count() }).from(userClinicRoles)
      .where(and(eq(userClinicRoles.clinicId, clinicId), eq(userClinicRoles.role, "admin")));
    if (Number(adminCount[0].count) <= 1) {
      throw new BadRequestException("Não é possível remover o último admin da clínica");
    }
  }

  // 4. Deletar
  await db.delete(userClinicRoles)
    .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)));

  return { message: "Membro removido com sucesso" };
}
```

### `updateMemberRole(clinicId, targetUserId, role)`

```typescript
async updateMemberRole(clinicId: string, targetUserId: string, role: string) {
  // 1. Buscar membro
  const member = await db.select().from(userClinicRoles)
    .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)))
    .limit(1);
  if (member.length === 0) throw new NotFoundException("Membro não encontrado");

  // 2. Se estava como admin e vai ser rebaixado, verificar se há outro admin
  if (member[0].role === "admin" && role !== "admin") {
    const adminCount = await db.select({ count: count() }).from(userClinicRoles)
      .where(and(eq(userClinicRoles.clinicId, clinicId), eq(userClinicRoles.role, "admin")));
    if (Number(adminCount[0].count) <= 1) {
      throw new BadRequestException("Não é possível rebaixar o último admin da clínica");
    }
  }

  // 3. Atualizar role
  await db.update(userClinicRoles)
    .set({ role: role as any })
    .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)));

  return { message: "Cargo atualizado com sucesso", member: { userId: targetUserId, role } };
}
```

### `resendInvite(clinicId, email)`

```typescript
async resendInvite(clinicId: string, email: string) {
  // 1. Buscar convite pendente
  const invite = await db.select().from(invites)
    .where(and(eq(invites.clinicId, clinicId), eq(invites.email, email), isNull(invites.usedAt)))
    .limit(1);
  if (invite.length === 0) throw new NotFoundException("Convite pendente não encontrado");

  // 2. Se expirado, renovar token e expiresAt
  const now = new Date();
  let token = invite[0].token;
  if (invite[0].expiresAt < now) {
    token = crypto.randomUUID(); // ou nanoid
    await db.update(invites)
      .set({ token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
      .where(eq(invites.id, invite[0].id));
  }

  // 3. Reenviar email via MailService
  await this.mailService.sendInviteEmail({
    to: invite[0].email,
    name: invite[0].name,
    token,
  });

  return { message: "Convite reenviado com sucesso" };
}
```

**Verificar se `MailService` está injetado no `ClinicsModule` e no construtor do `ClinicsService`. Se não estiver, injetar seguindo o padrão do módulo de invites.**

---

## 4. Controller: endpoints a adicionar

```typescript
@Delete(":clinicId/members/:userId")
@HttpCode(200)
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth("bearer")
@ApiOperation({ summary: "Remover membro da clínica" })
async removeMember(
  @Param("clinicId") clinicId: string,
  @Param("userId") userId: string,
  @CurrentUser() user: JwtPayload,
) {
  return this.clinicsService.removeMember(clinicId, user.userId, userId);
}

@Patch(":clinicId/members/:userId")
@HttpCode(200)
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth("bearer")
@ApiOperation({ summary: "Atualizar cargo do membro" })
async updateMemberRole(
  @Param("clinicId") clinicId: string,
  @Param("userId") userId: string,
  @Body() dto: UpdateMemberRoleDto,
) {
  return this.clinicsService.updateMemberRole(clinicId, userId, dto.role);
}

@Post(":clinicId/members/resend-invite")
@HttpCode(200)
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth("bearer")
@ApiOperation({ summary: "Reenviar convite pendente" })
async resendInvite(
  @Param("clinicId") clinicId: string,
  @Body() dto: ResendInviteDto,
) {
  return this.clinicsService.resendInvite(clinicId, dto.email);
}
```

> **Atenção:** O endpoint `POST :clinicId/members/resend-invite` deve ser declarado **antes** de `POST :clinicId/members/:userId` no controller para evitar conflito de rotas (NestJS resolve em ordem de declaração).

---

## Pronto quando

- `DELETE /api/v1/clinics/{id}/members/{userId}` retorna `{ message: "Membro removido com sucesso" }`
  - 400 se auto-remoção ou último admin
  - 404 se membro não existe
- `PATCH /api/v1/clinics/{id}/members/{userId}` com `{ role }` retorna `{ message, member }`
  - 400 se rebaixar último admin
  - 404 se membro não existe
- `POST /api/v1/clinics/{id}/members/resend-invite` com `{ email }` reenvia email
  - 404 se não há convite pendente para o email
- Todos exigem `IsClinicAdminGuard`
