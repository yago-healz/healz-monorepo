# Plano: Email Verification

## Contexto

Atualmente qualquer email pode ser cadastrado sem verificação. Isso permite contas com emails inválidos ou de terceiros. A verificação garante que o usuário realmente controla o email informado.

O fluxo: após registro, o usuário recebe um email com link contendo token. Ao clicar, o email é marcado como verificado. Endpoints protegidos podem exigir email verificado.

## Arquivos a Criar/Alterar

- `apps/api/src/db/schema/auth.schema.ts` — adicionar campos na tabela `users`
- `apps/api/src/auth/auth.service.ts` — métodos de verificação
- `apps/api/src/auth/auth.controller.ts` — novos endpoints
- `apps/api/src/auth/dto/verify-email.dto.ts` — DTO de verificação
- `apps/api/src/auth/dto/index.ts` — exportar novo DTO
- `apps/api/src/mail/mail.module.ts` — novo módulo de email
- `apps/api/src/mail/mail.service.ts` — serviço de envio
- `apps/api/src/auth/guards/email-verified.guard.ts` — guard opcional
- `apps/api/.env` — variáveis de configuração do email

## Passos

### 1. Adicionar campos na tabela `users`

**Em `auth.schema.ts`**, adicionar:

```typescript
import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Gerar migration: `pnpm drizzle-kit generate`

### 2. Criar módulo de email

**Criar `apps/api/src/mail/mail.service.ts`:**

Usar `nodemailer` para envio. Em desenvolvimento, usar [Ethereal](https://ethereal.email/) (emails fake para teste) ou `console.log` do link.

```bash
cd apps/api
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const isDev = configService.get("NODE_ENV") !== "production";

    if (isDev) {
      // Em dev, usa Ethereal (fake SMTP) — emails são capturados sem enviar de verdade
      // Alternativa: apenas logar no console
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: configService.get("SMTP_USER"),
          pass: configService.get("SMTP_PASS"),
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: configService.get("SMTP_HOST"),
        port: configService.get<number>("SMTP_PORT"),
        secure: true,
        auth: {
          user: configService.get("SMTP_USER"),
          pass: configService.get("SMTP_PASS"),
        },
      });
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get("FRONTEND_URL") || "http://localhost:3000";
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const info = await this.transporter.sendMail({
      from: this.configService.get("MAIL_FROM") || "Healz <noreply@healz.com>",
      to,
      subject: "Verifique seu email - Healz",
      html: `
        <h2>Verificação de Email</h2>
        <p>Clique no link abaixo para verificar seu email:</p>
        <a href="${verificationUrl}">Verificar Email</a>
        <p>Este link expira em 24 horas.</p>
        <p>Se você não criou uma conta, ignore este email.</p>
      `,
    });

    // Em dev, logar URL para preview do email
    if (this.configService.get("NODE_ENV") !== "production") {
      console.log("Verification email preview:", nodemailer.getTestMessageUrl(info));
      console.log("Verification URL:", verificationUrl);
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    // Será implementado no plano de password reset
    // Adicionado aqui para o MailService já ter a assinatura pronta
    throw new Error("Not implemented");
  }
}
```

**Criar `apps/api/src/mail/mail.module.ts`:**

```typescript
import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

### 3. Adicionar variáveis de ambiente

**Em `.env`:**

```env
# Mail (dev - usar Ethereal: https://ethereal.email/create)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=seu_usuario_ethereal
SMTP_PASS=sua_senha_ethereal
MAIL_FROM=Healz <noreply@healz.com>
```

**Atualizar `.env.example`:**

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=Healz <noreply@healz.com>
```

### 4. Criar DTO de verificação

**Criar `apps/api/src/auth/dto/verify-email.dto.ts`:**

```typescript
import { IsString } from "class-validator";

export class VerifyEmailDto {
  @IsString()
  token: string;
}
```

**Atualizar `apps/api/src/auth/dto/index.ts`** para exportar.

### 5. Implementar métodos no `auth.service.ts`

```typescript
import * as crypto from "crypto";
import { MailService } from "../mail/mail.service";

// Adicionar ao constructor:
constructor(
  private jwtService: JwtService,
  private mailService: MailService,
) {}

// Método para enviar email de verificação (chamado após registro)
async sendVerificationEmail(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 horas

  const user = await db
    .update(users)
    .set({
      emailVerificationToken: token,
      emailVerificationExpiry: expiry,
    })
    .where(eq(users.id, userId))
    .returning({ email: users.email });

  await this.mailService.sendVerificationEmail(user[0].email, token);
}

// Método para verificar email
async verifyEmail(token: string): Promise<void> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  if (!user[0]) {
    throw new BadRequestException("Token inválido");
  }

  if (new Date() > user[0].emailVerificationExpiry!) {
    throw new BadRequestException("Token expirado. Solicite um novo email de verificação.");
  }

  await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    })
    .where(eq(users.id, user[0].id));
}

// Método para reenviar email de verificação
async resendVerificationEmail(userId: string): Promise<void> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user[0]) {
    throw new BadRequestException("Usuário não encontrado");
  }

  if (user[0].emailVerified) {
    throw new BadRequestException("Email já verificado");
  }

  await this.sendVerificationEmail(userId);
}
```

### 6. Adicionar endpoints no `auth.controller.ts`

```typescript
@Post("verify-email")
@HttpCode(200)
async verifyEmail(@Body() dto: VerifyEmailDto) {
  await this.authService.verifyEmail(dto.token);
  return { message: "Email verificado com sucesso" };
}

@Post("resend-verification")
@UseGuards(JwtAuthGuard)
@HttpCode(200)
async resendVerification(@CurrentUser() user: JwtPayload) {
  await this.authService.resendVerificationEmail(user.userId);
  return { message: "Email de verificação reenviado" };
}
```

### 7. Enviar email de verificação no registro

Se já existir um endpoint de registro, adicionar a chamada ao `sendVerificationEmail` após criar o usuário. Se não existir, incluir no fluxo quando for criado.

No `login()`, incluir a flag `emailVerified` na resposta para o frontend saber se precisa mostrar aviso:

```typescript
return {
  accessToken,
  refreshToken,
  user: {
    id: user[0].id,
    email: user[0].email,
    name: user[0].name,
    emailVerified: user[0].emailVerified,
    activeClinic: { /* ... */ },
    availableClinics: payload.clinicAccess,
  },
};
```

### 8. (Opcional) Guard de email verificado

Para endpoints que exigem email verificado, criar um guard:

**Criar `apps/api/src/auth/guards/email-verified.guard.ts`:**

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) return false;

    const user = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]?.emailVerified) {
      throw new ForbiddenException("Email não verificado. Verifique seu email para continuar.");
    }

    return true;
  }
}
```

Uso:

```typescript
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Post("sensitive-action")
async sensitiveAction() { /* ... */ }
```

### 9. Registrar `MailModule` no `app.module.ts`

```typescript
import { MailModule } from "./mail/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "apps/api/.env" }),
    AuthModule,
    MailModule,
  ],
  // ...
})
```

### 10. Gerar e aplicar migration

```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Resultado Esperado

- Novos usuários recebem email de verificação após registro
- Endpoint `POST /auth/verify-email` valida o token e marca email como verificado
- Endpoint `POST /auth/resend-verification` permite reenvio (requer autenticação)
- Em dev, links de verificação são logados no console
- Guard opcional permite exigir email verificado em endpoints sensíveis
- Campo `emailVerified` retornado no login para o frontend
