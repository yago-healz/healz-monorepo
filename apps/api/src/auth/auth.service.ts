// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { clinics, refreshTokens, userClinicRoles, users } from "../db/schema";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(email: string, password: string, preferredClinicId?: string) {
    // 1. Validar credenciais
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user[0]) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user[0].passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

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

    if (userClinics.length === 0) {
      throw new UnauthorizedException("User has no clinic access");
    }

    // 3. Determinar clínica ativa
    let activeClinic = userClinics[0];
    if (preferredClinicId) {
      const preferred = userClinics.find(
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
      organizationId: activeClinic.organizationId,
      activeClinicId: activeClinic.clinicId,
      clinicAccess: userClinics.map((c) => ({
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        role: c.role,
      })),
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const refreshToken = await this.generateRefreshToken(user[0].id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        activeClinic: {
          id: activeClinic.clinicId,
          name: activeClinic.clinicName,
          organizationId: activeClinic.organizationId,
          role: activeClinic.role,
        },
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
    // 1. Verificar se refresh token existe e é válido
    const tokenRecord = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshTokenValue))
      .limit(1);

    if (!tokenRecord[0]) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (new Date() > tokenRecord[0].expiresAt) {
      // Token expirado, remover do banco
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, tokenRecord[0].id));
      throw new UnauthorizedException("Refresh token expired");
    }

    // 2. Buscar dados do usuário para gerar novo access token
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord[0].userId))
      .limit(1);

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

    // 3. Gerar novo access token (mantém mesmo contexto de clínica ativa)
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

    return { accessToken };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId, type: "refresh" },
      { expiresIn: "7d" },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  async logout(refreshTokenValue: string) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.token, refreshTokenValue));
  }
}
