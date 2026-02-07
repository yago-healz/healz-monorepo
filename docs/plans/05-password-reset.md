# Plano: Password Reset

## Contexto

Não existe fluxo de recuperação de senha. Se o usuário esquecer a senha, não tem como recuperar o acesso. O fluxo padrão: solicitar reset via email, receber link com token temporário, definir nova senha.

**Pré-requisito**: O módulo de email (`MailModule`) com Resend **deve** estar implementado (ver plano 04-email-verification). O `MailService` já possui o método `sendPasswordResetEmail` implementado, então este plano foca apenas nos campos da database, DTOs e endpoints.

## Arquivos a Criar/Alterar

- `apps/api/src/db/schema/auth.schema.ts` — adicionar campos na tabela `users`
- `apps/api/src/auth/auth.service.ts` — métodos de reset
- `apps/api/src/auth/auth.controller.ts` — novos endpoints
- `apps/api/src/auth/dto/forgot-password.dto.ts` — DTO
- `apps/api/src/auth/dto/reset-password.dto.ts` — DTO
- `apps/api/src/auth/dto/index.ts` — exportar DTOs

## Passos

### 1. Adicionar campos na tabela `users`

**Em `auth.schema.ts`**, adicionar campos de reset:

```typescript
export const users = pgTable("users", {
  // ... campos existentes
  resetPasswordToken: varchar("reset_password_token", { length: 255 }),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
});
```

Gerar migration: `pnpm drizzle-kit generate`

**Nota**: se o plano de email verification já foi implementado, os campos `emailVerified`, `emailVerificationToken` e `emailVerificationExpiry` já existirão. Basta adicionar os dois novos campos.

### 2. Criar DTOs

**Criar `apps/api/src/auth/dto/forgot-password.dto.ts`:**

```typescript
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
```

**Criar `apps/api/src/auth/dto/reset-password.dto.ts`:**

```typescript
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
```

Exportar ambos em `dto/index.ts`.

### 3. Implementar métodos no `auth.service.ts`

**Nota**: O `MailService.sendPasswordResetEmail()` já está implementado com Resend no plano 04-email-verification. Basta injetar o `MailService` no constructor se ainda não estiver.

```typescript
async forgotPassword(email: string): Promise<void> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // IMPORTANTE: sempre retornar sucesso, mesmo se email não existir.
  // Isso previne enumeração de emails.
  if (!user[0]) return;

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hora

  await db
    .update(users)
    .set({
      resetPasswordToken: token,
      resetPasswordExpiry: expiry,
    })
    .where(eq(users.id, user[0].id));

  await this.mailService.sendPasswordResetEmail(email, token);
}

async resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.resetPasswordToken, token))
    .limit(1);

  if (!user[0]) {
    throw new BadRequestException("Token inválido");
  }

  if (new Date() > user[0].resetPasswordExpiry!) {
    throw new BadRequestException("Token expirado. Solicite um novo reset de senha.");
  }

  // Hash da nova senha
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Atualizar senha e limpar token
  await db
    .update(users)
    .set({
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    })
    .where(eq(users.id, user[0].id));

  // Revogar todos os refresh tokens do usuário (forçar re-login)
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.userId, user[0].id));
}
```

### 4. Adicionar endpoints no `auth.controller.ts`

```typescript
@Post("forgot-password")
@HttpCode(200)
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  await this.authService.forgotPassword(dto.email);
  // Sempre retorna sucesso (previne enumeração de emails)
  return { message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha." };
}

@Post("reset-password")
@HttpCode(200)
async resetPassword(@Body() dto: ResetPasswordDto) {
  await this.authService.resetPassword(dto.token, dto.newPassword);
  return { message: "Senha alterada com sucesso. Faça login com sua nova senha." };
}
```

**Nota**: nenhum dos dois endpoints requer autenticação (o usuário esqueceu a senha, não consegue fazer login).

### 5. Rate limiting nos endpoints de reset

Estes endpoints são alvos de abuso. Aplicar throttle específico:

```typescript
@Post("forgot-password")
@HttpCode(200)
@Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 requests por minuto
async forgotPassword(/* ... */) { /* ... */ }

@Post("reset-password")
@HttpCode(200)
@Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 requests por minuto
async resetPassword(/* ... */) { /* ... */ }
```

**Nota**: requer que o plano 02-rate-limiting já esteja implementado. Caso contrário, ignorar este passo por agora.

### 6. Gerar e aplicar migration

```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Considerações de Segurança

- **Resposta genérica no forgot-password**: nunca revelar se o email existe ou não
- **Token expira em 1 hora**: janela curta para uso
- **Token de uso único**: limpo após uso
- **Revogação de sessões**: após reset, todos os refresh tokens são deletados (forçar re-login em todos os dispositivos)
- **Rate limiting**: prevenir spam de emails e brute force no reset

## Resultado Esperado

- `POST /auth/forgot-password` — envia email com link de reset via Resend (resposta sempre genérica)
- `POST /auth/reset-password` — valida token e atualiza senha
- Tokens expiram em 1 hora
- Após reset, usuário é deslogado de todos os dispositivos
- Emails enviados através do Resend com template HTML

## Notas Adicionais

- **MailService**: O método `sendPasswordResetEmail` já está implementado no `MailService` usando Resend (ver plano 04-email-verification)
- **Domínio**: Por padrão usa `onboarding@resend.dev`. Para produção, configure um domínio próprio no painel do Resend
- **Rate Limits**: Resend free tier permite 100 emails/dia, 3000/mês
