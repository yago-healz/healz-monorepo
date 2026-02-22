import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../infrastructure/database";
import { platformAdmins, users } from "../../infrastructure/database/schema";
import { AuditService } from "../../infrastructure/audit/audit.service";

@Injectable()
export class PlatformAdminAdminsService {
  constructor(private auditService: AuditService) {}

  async list(adminUserId: string) {
    const admins = await db
      .select({
        id: platformAdmins.id,
        userId: platformAdmins.userId,
        userName: users.name,
        userEmail: users.email,
        createdAt: platformAdmins.createdAt,
        revokedAt: platformAdmins.revokedAt,
      })
      .from(platformAdmins)
      .innerJoin(users, eq(platformAdmins.userId, users.id));

    this.auditService.log({
      userId: adminUserId,
      action: "READ",
      resource: "/api/platform-admin/admins",
      method: "GET",
      statusCode: 200,
    });

    return {
      data: admins.map((a) => ({
        id: a.id,
        user: {
          id: a.userId,
          name: a.userName,
          email: a.userEmail,
        },
        createdAt: a.createdAt,
        status: a.revokedAt ? "revoked" : "active",
      })),
    };
  }

  async create(userId: string, creatorUserId: string, ip?: string) {
    // 1. Verificar se usuário existe
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    // 2. Verificar se já é admin
    const existing = await db
      .select()
      .from(platformAdmins)
      .where(
        and(eq(platformAdmins.userId, userId), isNull(platformAdmins.revokedAt)),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException("Usuário já é platform admin");
    }

    // 3. Criar platform admin
    const [admin] = await db
      .insert(platformAdmins)
      .values({
        userId,
        createdBy: creatorUserId,
      })
      .returning();

    // 4. Log auditoria
    this.auditService.log({
      userId: creatorUserId,
      action: "CREATE",
      resource: "/api/platform-admin/admins",
      method: "POST",
      statusCode: 201,
      ip,
      metadata: {
        grantedToUserId: userId,
        grantedToEmail: user.email,
      },
    });

    return {
      id: admin.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: "Permissões de platform admin concedidas",
    };
  }

  async revoke(adminId: string, revokerUserId: string, ip?: string) {
    // Buscar admin
    const [admin] = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.id, adminId))
      .limit(1);

    if (!admin) {
      throw new NotFoundException("Platform admin não encontrado");
    }

    // Revogar
    await db
      .update(platformAdmins)
      .set({
        revokedAt: new Date(),
        revokedBy: revokerUserId,
      })
      .where(eq(platformAdmins.id, adminId));

    // Log
    this.auditService.log({
      userId: revokerUserId,
      action: "REVOKE_ADMIN",
      resource: `/api/platform-admin/admins/${adminId}`,
      method: "DELETE",
      statusCode: 200,
      ip,
      metadata: {
        revokedUserId: admin.userId,
      },
    });

    return { message: "Permissões de platform admin revogadas" };
  }
}
