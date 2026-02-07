# Plano: Refresh Token Rotation

## Contexto

Atualmente o `refreshAccessToken()` em `auth.service.ts` valida o refresh token e gera um novo access token, mas **reutiliza o mesmo refresh token** até ele expirar (7 dias). Se o token vazar, pode ser usado indefinidamente até a expiração.

Com **rotation**, cada uso do refresh token invalida o antigo e emite um novo. Se um token já usado for apresentado novamente, isso indica possível roubo — e todos os tokens do usuário são revogados.

## Arquivos Afetados

- `apps/api/src/db/schema/auth.schema.ts` — adicionar campo `family` na tabela `refresh_tokens`
- `apps/api/src/auth/auth.service.ts` — alterar `refreshAccessToken()` e `generateRefreshToken()`
- `apps/api/src/auth/auth.controller.ts` — setar novo cookie no refresh

## Passos

### 1. Adicionar campo `family` na tabela `refresh_tokens`

O campo `family` agrupa todos os refresh tokens de uma mesma sessão. Quando detectamos reuso de um token já consumido, revogamos toda a família.

**Em `auth.schema.ts`**, adicionar o campo `family` e `revokedAt`:

```typescript
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 500 }).notNull().unique(),
  family: uuid("family").notNull(), // agrupa tokens da mesma sessão
  revokedAt: timestamp("revoked_at"), // null = ativo, preenchido = já foi rotacionado
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Gerar migration: `pnpm drizzle-kit generate`

### 2. Alterar `generateRefreshToken()` em `auth.service.ts`

Aceitar um parâmetro opcional `family`. No login, criar uma família nova. No refresh, reutilizar a família existente.

```typescript
private async generateRefreshToken(
  userId: string,
  family?: string,
): Promise<{ token: string; family: string }> {
  const crypto = await import("crypto");
  const token = crypto.randomBytes(64).toString("hex");
  const tokenFamily = family ?? crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(refreshTokens).values({
    userId,
    token,
    family: tokenFamily,
    expiresAt,
  });

  return { token, family: tokenFamily };
}
```

**Nota**: trocar de JWT para `crypto.randomBytes` para o refresh token. Refresh tokens não precisam ser JWTs — são opacos e validados via banco de dados. Isso é mais seguro pois o token não carrega informação decodificável.

### 3. Alterar `refreshAccessToken()` em `auth.service.ts`

Lógica:
1. Buscar token no banco
2. Se `revokedAt` preenchido → token já foi usado → **revogar toda a família** (possível roubo)
3. Se válido, marcar como revogado (`revokedAt = now()`)
4. Gerar novo refresh token na mesma família
5. Retornar novo access token + novo refresh token

```typescript
async refreshAccessToken(refreshTokenValue: string) {
  const tokenRecord = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshTokenValue))
    .limit(1);

  if (!tokenRecord[0]) {
    throw new UnauthorizedException("Invalid refresh token");
  }

  // Detecção de reuso: token já foi rotacionado
  if (tokenRecord[0].revokedAt) {
    // Revogar TODA a família (possível roubo de token)
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.family, tokenRecord[0].family));
    throw new UnauthorizedException("Token reuse detected. All sessions revoked.");
  }

  // Token expirado
  if (new Date() > tokenRecord[0].expiresAt) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord[0].id));
    throw new UnauthorizedException("Refresh token expired");
  }

  // Marcar token atual como revogado (já usado)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, tokenRecord[0].id));

  // Gerar novo refresh token na mesma família
  const newRefresh = await this.generateRefreshToken(
    tokenRecord[0].userId,
    tokenRecord[0].family,
  );

  // Buscar dados do usuário e gerar access token (código existente)
  const user = await db.select().from(users).where(eq(users.id, tokenRecord[0].userId)).limit(1);
  const userClinics = await db
    .select({ clinicId: userClinicRoles.clinicId, clinicName: clinics.name, organizationId: clinics.organizationId, role: userClinicRoles.role })
    .from(userClinicRoles)
    .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
    .where(eq(userClinicRoles.userId, user[0].id));

  const payload: JwtPayload = {
    userId: user[0].id,
    email: user[0].email,
    organizationId: userClinics[0].organizationId,
    activeClinicId: userClinics[0].clinicId,
    clinicAccess: userClinics.map((c) => ({
      clinicId: c.clinicId,
      clinicName: c.clinicName,
      role: c.role,
    })),
  };

  const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });

  return { accessToken, refreshToken: newRefresh.token };
}
```

### 4. Alterar `login()` em `auth.service.ts`

Ajustar para usar a nova assinatura de `generateRefreshToken`:

```typescript
const { token: refreshToken } = await this.generateRefreshToken(user[0].id);
```

### 5. Alterar `refresh()` no `auth.controller.ts`

O endpoint precisa setar o novo refresh token como cookie na resposta:

```typescript
@Post("refresh")
@HttpCode(200)
async refresh(
  @Req() request: Request,
  @Res({ passthrough: true }) response: Response,
) {
  const refreshToken = request.cookies["refreshToken"];
  if (!refreshToken) {
    throw new UnauthorizedException("No refresh token");
  }

  const result = await this.authService.refreshAccessToken(refreshToken);

  // Setar novo refresh token no cookie
  response.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken: result.accessToken };
}
```

### 6. Alterar `logout()` em `auth.service.ts`

Revogar toda a família ao fazer logout:

```typescript
async logout(refreshTokenValue: string) {
  const tokenRecord = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshTokenValue))
    .limit(1);

  if (tokenRecord[0]) {
    // Deletar toda a família de tokens
    await db.delete(refreshTokens).where(eq(refreshTokens.family, tokenRecord[0].family));
  }
}
```

### 7. Gerar e aplicar migration

```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 8. Limpeza de tokens expirados (opcional, recomendado)

Criar um cron job ou scheduled task para limpar tokens expirados periodicamente:

```typescript
// Em auth.service.ts
async cleanupExpiredTokens() {
  await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
}
```

Registrar com `@nestjs/schedule` se quiser automático, ou executar via cron externo.

## Resultado Esperado

- Cada refresh gera um novo refresh token e invalida o anterior
- Reuso de token já rotacionado revoga toda a sessão
- Logout invalida toda a cadeia de tokens
- Refresh tokens são opacos (não JWTs), sem informação decodificável
