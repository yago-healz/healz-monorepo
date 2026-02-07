import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { clinics, refreshTokens, userClinicRoles, users } from "../../db/schema";
import { AuditService } from "../../audit/audit.service";

@Injectable()
export class PlatformAdminImpersonationService {
  constructor(
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async impersonate(targetUserId: string, adminUserId: string, ip?: string) {
    // 1. Buscar usuário alvo
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException("Usuário não encontrado");
    }

    // 2. Verificar se está ativo
    if (targetUser.status !== "active") {
      throw new BadRequestException(
        "Não é possível impersonar usuário inativo",
      );
    }

    // 3. Buscar clínicas
    const userClinics = await db
      .select({
        clinicId: userClinicRoles.clinicId,
        clinicName: clinics.name,
        organizationId: clinics.organizationId,
        role: userClinicRoles.role,
      })
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(eq(userClinicRoles.userId, targetUserId));

    if (userClinics.length === 0) {
      throw new BadRequestException(
        "Usuário não tem acesso a nenhuma clínica",
      );
    }

    // 4. Build JWT payload com flag impersonation
    const payload = {
      userId: targetUser.id,
      email: targetUser.email,
      organizationId: userClinics[0].organizationId,
      activeClinicId: userClinics[0].clinicId,
      clinicAccess: userClinics.map((c) => ({
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        role: c.role,
      })),
      impersonatedBy: adminUserId,
      isImpersonating: true,
    };

    // 5. Gerar token com expiração CURTA
    const accessToken = this.jwtService.sign(payload, { expiresIn: "5m" });

    // 6. CRITICAL: Log auditoria
    this.auditService.log({
      userId: adminUserId,
      action: "IMPERSONATE",
      resource: `/api/platform-admin/users/${targetUserId}/impersonate`,
      method: "POST",
      statusCode: 200,
      ip,
      metadata: {
        targetUserId,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.name,
      },
    });

    return {
      accessToken,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        isImpersonating: true,
        impersonatedBy: adminUserId,
      },
    };
  }

  async revokeAllSessions(
    userId: string,
    adminUserId: string,
    ip?: string,
  ) {
    const result = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId))
      .returning({ id: refreshTokens.id });

    this.auditService.log({
      userId: adminUserId,
      action: "REVOKE_SESSIONS",
      resource: `/api/platform-admin/users/${userId}/revoke-sessions`,
      method: "POST",
      statusCode: 200,
      ip,
      metadata: {
        targetUserId: userId,
        revokedCount: result.length,
      },
    });

    return {
      message: "Todas as sessões foram revogadas",
      revokedCount: result.length,
    };
  }
}
