// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { randomBytes, randomUUID } from "crypto";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "../db";
import { clinics, refreshTokens, userClinicRoles, users } from "../db/schema";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private auditService: AuditService,
    private mailService: MailService,
  ) {}

  async login(email: string, password: string, preferredClinicId?: string, ip?: string) {
    // 1. Validar credenciais
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user[0]) {
      // Log failed login attempt
      this.auditService.log({
        action: "LOGIN_FAILED",
        resource: "/api/auth/login",
        method: "POST",
        ip,
        metadata: { email },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user[0].passwordHash,
    );
    if (!isPasswordValid) {
      // Log failed login attempt
      this.auditService.log({
        action: "LOGIN_FAILED",
        resource: "/api/auth/login",
        method: "POST",
        ip,
        metadata: { email },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    // 1.5 Verificar se usuário está ativo
    if (user[0].status !== "active") {
      this.auditService.log({
        action: "LOGIN_FAILED",
        resource: "/api/auth/login",
        method: "POST",
        ip,
        metadata: { email, reason: "user_inactive" },
      });
      throw new UnauthorizedException(
        "Conta desativada. Entre em contato com o suporte.",
      );
    }

    // 1.7 Verificar se é Platform Admin
    const { platformAdmins } = await import("../db/schema");
    const platformAdmin = await db
      .select()
      .from(platformAdmins)
      .where(
        and(
          eq(platformAdmins.userId, user[0].id),
          isNull(platformAdmins.revokedAt),
        ),
      )
      .limit(1);

    const isPlatformAdmin = platformAdmin.length > 0;

    // 2. Buscar todas as clínicas que o usuário tem acesso
    const userClinics = await db
      .select({
        clinicId: userClinicRoles.clinicId,
        clinicName: clinics.name,
        organizationId: clinics.organizationId,
        role: userClinicRoles.role,
      })
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(eq(userClinicRoles.userId, user[0].id));

    // Platform Admins podem logar sem clínicas
    if (userClinics.length === 0 && !isPlatformAdmin) {
      throw new UnauthorizedException("User has no clinic access");
    }

    // 2.5 Filtrar apenas clínicas e organizações ativas
    const { organizations } = await import("../db/schema");

    const activeUserClinics = [];
    for (const uc of userClinics) {
      const [clinicData] = await db
        .select({
          clinicStatus: clinics.status,
          orgStatus: organizations.status,
        })
        .from(clinics)
        .innerJoin(organizations, eq(clinics.organizationId, organizations.id))
        .where(eq(clinics.id, uc.clinicId))
        .limit(1);

      if (
        clinicData?.clinicStatus === "active" &&
        clinicData?.orgStatus === "active"
      ) {
        activeUserClinics.push(uc);
      }
    }

    // Platform Admins podem não ter clínicas ativas
    if (activeUserClinics.length === 0 && !isPlatformAdmin) {
      this.auditService.log({
        action: "LOGIN_FAILED",
        resource: "/api/auth/login",
        method: "POST",
        ip,
        metadata: { email, reason: "no_active_clinics" },
      });
      throw new UnauthorizedException("Nenhuma clínica ativa disponível");
    }

    // 3. Determinar clínica ativa (se houver)
    let activeClinic = activeUserClinics.length > 0 ? activeUserClinics[0] : null;
    if (preferredClinicId && activeUserClinics.length > 0) {
      const preferred = activeUserClinics.find(
        (c) => c.clinicId === preferredClinicId,
      );
      if (preferred) {
        activeClinic = preferred;
      }
    }

    // 4. Gerar tokens
    const payload: JwtPayload = {
      userId: user[0].id,
      email: user[0].email,
      organizationId: activeClinic?.organizationId,
      activeClinicId: activeClinic?.clinicId,
      clinicAccess: activeUserClinics.map((c) => ({
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        role: c.role,
      })),
      isPlatformAdmin: isPlatformAdmin,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const { token: refreshToken } = await this.generateRefreshToken(user[0].id);

    // Log successful login
    this.auditService.log({
      userId: user[0].id,
      organizationId: activeClinic?.organizationId,
      clinicId: activeClinic?.clinicId,
      action: "LOGIN",
      resource: "/api/auth/login",
      method: "POST",
      ip,
      statusCode: 200,
    });

    // Atualizar lastLoginAt
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user[0].id));

    return {
      accessToken,
      refreshToken,
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        emailVerified: user[0].emailVerified,
        activeClinic: activeClinic
          ? {
              id: activeClinic.clinicId,
              name: activeClinic.clinicName,
              organizationId: activeClinic.organizationId,
              role: activeClinic.role,
            }
          : null,
        availableClinics: payload.clinicAccess,
      },
    };
  }

  async switchContext(userId: string, newClinicId: string) {
    // 1. Verificar se usuário tem acesso à clínica
    const userClinic = await db
      .select({
        clinicId: userClinicRoles.clinicId,
        clinicName: clinics.name,
        organizationId: clinics.organizationId,
        role: userClinicRoles.role,
      })
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, userId),
          eq(userClinicRoles.clinicId, newClinicId),
        ),
      )
      .limit(1);

    if (!userClinic[0]) {
      throw new BadRequestException("User does not have access to this clinic");
    }

    // 2. Buscar todas as clínicas novamente (para payload completo)
    const allUserClinics = await db
      .select({
        clinicId: userClinicRoles.clinicId,
        clinicName: clinics.name,
        role: userClinicRoles.role,
      })
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(eq(userClinicRoles.userId, userId));

    // 3. Buscar email do usuário
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // 4. Gerar novo access token com novo contexto
    const payload: JwtPayload = {
      userId: userId,
      email: user[0].email,
      organizationId: userClinic[0].organizationId,
      activeClinicId: newClinicId,
      clinicAccess: allUserClinics.map((c) => ({
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        role: c.role,
      })),
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });

    return { accessToken };
  }

  async refreshAccessToken(refreshTokenValue: string) {
    // 1. Verificar se refresh token existe
    const tokenRecord = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshTokenValue))
      .limit(1);

    if (!tokenRecord[0]) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // 2. Detecção de reuso: token já foi rotacionado
    if (tokenRecord[0].revokedAt) {
      // Revogar TODA a família (possível roubo de token)
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.family, tokenRecord[0].family));
      throw new UnauthorizedException("Token reuse detected. All sessions revoked.");
    }

    // 3. Verificar se token expirou
    if (new Date() > tokenRecord[0].expiresAt) {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, tokenRecord[0].id));
      throw new UnauthorizedException("Refresh token expired");
    }

    // 4. Marcar token atual como revogado (já usado)
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenRecord[0].id));

    // 5. Gerar novo refresh token na mesma família
    const newRefresh = await this.generateRefreshToken(
      tokenRecord[0].userId,
      tokenRecord[0].family,
    );

    // 6. Buscar dados do usuário para gerar novo access token
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord[0].userId))
      .limit(1);

    // 6.5 Verificar se é Platform Admin
    const { platformAdmins } = await import("../db/schema");
    const platformAdmin = await db
      .select()
      .from(platformAdmins)
      .where(
        and(
          eq(platformAdmins.userId, user[0].id),
          isNull(platformAdmins.revokedAt),
        ),
      )
      .limit(1);

    const isPlatformAdmin = platformAdmin.length > 0;

    const userClinics = await db
      .select({
        clinicId: userClinicRoles.clinicId,
        clinicName: clinics.name,
        organizationId: clinics.organizationId,
        role: userClinicRoles.role,
      })
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(eq(userClinicRoles.userId, user[0].id));

    // 7. Gerar novo access token (mantém mesmo contexto de clínica ativa)
    const payload: JwtPayload = {
      userId: user[0].id,
      email: user[0].email,
      organizationId: userClinics.length > 0 ? userClinics[0].organizationId : undefined,
      activeClinicId: userClinics.length > 0 ? userClinics[0].clinicId : undefined,
      clinicAccess: userClinics.map((c) => ({
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        role: c.role,
      })),
      isPlatformAdmin: isPlatformAdmin,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });

    return { accessToken, refreshToken: newRefresh.token };
  }

  private async generateRefreshToken(
    userId: string,
    family?: string,
  ): Promise<{ token: string; family: string }> {
    const token = randomBytes(64).toString("hex");
    const tokenFamily = family ?? randomUUID();

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

  async logout(refreshTokenValue: string, userId?: string) {
    const tokenRecord = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshTokenValue))
      .limit(1);

    if (tokenRecord[0]) {
      // Deletar toda a família de tokens
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.family, tokenRecord[0].family));

      // Log logout (use provided userId or get from token)
      const logUserId = userId || tokenRecord[0].userId;
      this.auditService.log({
        userId: logUserId,
        action: "LOGOUT",
        resource: "/api/auth/logout",
        method: "POST",
        statusCode: 204,
      });
    }
  }

  async cleanupExpiredTokens() {
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  }

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
      throw new BadRequestException(
        "Token expirado. Solicite um novo email de verificação.",
      );
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

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      throw new BadRequestException("Usuário não encontrado");
    }

    if (user[0].emailVerified) {
      throw new BadRequestException("Email já verificado");
    }

    await this.sendVerificationEmail(userId);
  }

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
      throw new BadRequestException(
        "Token expirado. Solicite um novo reset de senha.",
      );
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
}
