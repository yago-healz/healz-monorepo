import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  auditLogs,
  clinics,
  invites,
  organizations,
  refreshTokens,
  userClinicRoles,
  users,
} from "../../db/schema";
import { AuditService } from "../../audit/audit.service";
import { MailService } from "../../mail/mail.service";
import { ListUsersQueryDto } from "../dto/users/list-users-query.dto";
import { CreateUserDto } from "../dto/users/create-user.dto";
import { UpdateUserDto } from "../dto/users/update-user.dto";
import { UpdateUserStatusDto } from "../dto/users/update-user-status.dto";
import { AddUserClinicDto } from "../dto/users/add-user-clinic.dto";
import { UpdateUserClinicDto } from "../dto/users/update-user-clinic.dto";
import { AdminResetPasswordDto } from "../dto/users/reset-password.dto";
import {
  calculatePagination,
  buildPaginatedResponse,
} from "../utils/pagination.helper";
import { InvitesService } from "../../invites/invites.service";

@Injectable()
export class PlatformAdminUsersService {
  constructor(
    private auditService: AuditService,
    private mailService: MailService,
    private invitesService: InvitesService,
  ) {}

  async list(query: ListUsersQueryDto, adminUserId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      organizationId,
      clinicId,
      role,
      emailVerified = "all",
      status = "active",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;
    const { limit: take, offset: skip } = calculatePagination(page, limit);

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(users.status, status as "active" | "inactive"));
    }

    if (emailVerified && emailVerified !== "all") {
      conditions.push(
        eq(users.emailVerified, emailVerified === "true"),
      );
    }

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
        ),
      );
    }

    if (role) {
      conditions.push(eq(userClinicRoles.role, role as "admin" | "manager" | "doctor" | "receptionist" | "viewer"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query base
    let query_= db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        hasPassword: sql<boolean>`${users.passwordHash} IS NOT NULL AND ${users.passwordHash} != ''`,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause);

    // Aplicar filtros de clinic e role se necessário
    if (clinicId || organizationId || role) {
      query_ = query_
        .innerJoin(userClinicRoles, eq(users.id, userClinicRoles.userId))
        .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id));

      if (clinicId) {
        conditions.push(eq(userClinicRoles.clinicId, clinicId));
      }

      if (role) {
        conditions.push(eq(userClinicRoles.role, role as "admin" | "manager" | "doctor" | "receptionist" | "viewer"));
      }

      if (organizationId) {
        conditions.push(eq(clinics.organizationId, organizationId));
      }
    }

    // Count
    const [{ count }] = await db
      .select({ count: sql<number>`count(DISTINCT ${users.id})::int` })
      .from(users)
      .where(whereClause)
      .leftJoin(userClinicRoles, eq(users.id, userClinicRoles.userId))
      .leftJoin(clinics, eq(userClinicRoles.clinicId, clinics.id));

    // Paginate
    let usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        hasPassword: sql<boolean>`${users.passwordHash} IS NOT NULL AND ${users.passwordHash} != ''`,
        status: users.status,
        createdAt: users.createdAt,
        clinicId: userClinicRoles.clinicId,
        clinicName: clinics.name,
        organizationId: clinics.organizationId,
        organizationName: organizations.name,
        clinicRole: userClinicRoles.role,
      })
      .from(users)
      .leftJoin(userClinicRoles, eq(users.id, userClinicRoles.userId))
      .leftJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .leftJoin(organizations, eq(clinics.organizationId, organizations.id))
      .where(whereClause)
      .limit(take)
      .offset(skip);

    // Group by user
    const usersMap = new Map();
    usersData.forEach((row) => {
      if (!usersMap.has(row.id)) {
        usersMap.set(row.id, {
          id: row.id,
          name: row.name,
          email: row.email,
          emailVerified: row.emailVerified,
          hasPassword: row.hasPassword,
          status: row.status,
          createdAt: row.createdAt,
          clinics: [],
        });
      }
      if (row.clinicId) {
        usersMap.get(row.id).clinics.push({
          clinicId: row.clinicId,
          clinicName: row.clinicName,
          organizationName: row.organizationName,
          role: row.clinicRole,
        });
      }
    });

    const result = Array.from(usersMap.values());

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortBy as keyof typeof a];
      let bVal: any = b[sortBy as keyof typeof b];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    this.auditService.log({
      userId: adminUserId,
      action: "READ",
      resource: "/api/platform-admin/users",
      method: "GET",
      statusCode: 200,
    });

    return buildPaginatedResponse(result, count, page, limit);
  }

  async getById(id: string, adminUserId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    const clinics_data = await db
      .select({
        clinicId: userClinicRoles.clinicId,
        clinicName: clinics.name,
        organizationId: organizations.id,
        organizationName: organizations.name,
        role: userClinicRoles.role,
        joinedAt: userClinicRoles.createdAt,
      })
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .innerJoin(organizations, eq(clinics.organizationId, organizations.id))
      .where(eq(userClinicRoles.userId, id));

    const recentActivity = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        method: auditLogs.method,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, id))
      .orderBy((t) => sql`${t.createdAt} DESC`)
      .limit(10);

    this.auditService.log({
      userId: adminUserId,
      action: "READ",
      resource: `/api/platform-admin/users/${id}`,
      method: "GET",
      statusCode: 200,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      clinics: clinics_data,
      recentActivity,
    };
  }

  async create(dto: CreateUserDto, adminUserId: string, ip?: string) {
    const { name, email, clinicId, role, sendInvite, password } = dto;

    // Verificar se email já existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new BadRequestException("Email já cadastrado");
    }

    // Verificar se clínica existe (apenas se informada)
    let clinic: typeof clinics.$inferSelect | undefined;
    if (clinicId) {
      const [foundClinic] = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, clinicId))
        .limit(1);

      if (!foundClinic) {
        throw new NotFoundException("Clínica não encontrada");
      }
      clinic = foundClinic;
    }

    if (sendInvite && !password) {
      // Criar usuário e enviar convite
      const newUserResult = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash: "", // Será definido ao aceitar invite
          status: "active",
        })
        .returning();

      const newUser = (newUserResult as any[])[0];

      if (clinicId && role) {
        // Adicionar a clínica
        await db.insert(userClinicRoles).values({
          userId: newUser.id,
          clinicId,
          role,
        });

        await this.invitesService.createInviteForUser(
          adminUserId,
          clinic!.organizationId,
          { email, name, clinicId, role },
          ip,
        );
      }

      this.auditService.log({
        userId: adminUserId,
        action: "CREATE",
        resource: "/api/platform-admin/users",
        method: "POST",
        statusCode: 201,
        ip,
        metadata: { userId: newUser.id, email, sendInvite: true },
      });

      return {
        id: newUser.id,
        email,
        name,
        status: "active",
        message: "Usuário criado e convite enviado",
      };
    } else {
      // Criar usuário com senha
      if (!password) {
        throw new BadRequestException(
          "Senha obrigatória quando sendInvite = false",
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUserResult = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash,
          status: "active",
          emailVerified: true,
        })
        .returning();

      const newUser = (newUserResult as any[])[0];

      if (clinicId && role) {
        // Adicionar a clínica
        await db.insert(userClinicRoles).values({
          userId: newUser.id,
          clinicId,
          role,
        });
      }

      this.auditService.log({
        userId: adminUserId,
        action: "CREATE",
        resource: "/api/platform-admin/users",
        method: "POST",
        statusCode: 201,
        ip,
        metadata: { userId: newUser.id, email, sendInvite: false },
      });

      return {
        id: newUser.id,
        email,
        name,
        status: "active",
        message: "Usuário criado com sucesso",
      };
    }
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    adminUserId: string,
    ip?: string,
  ) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    const updates: any = { updatedAt: new Date() };

    if (dto.name) updates.name = dto.name;

    if (dto.email && dto.email !== user.email) {
      // Verificar se novo email já existe
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, dto.email))
        .limit(1);

      if (existing.length > 0) {
        throw new BadRequestException("Email já cadastrado");
      }

      updates.email = dto.email;
      updates.emailVerified = false; // Exigir re-verificação
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    this.auditService.log({
      userId: adminUserId,
      action: "UPDATE",
      resource: `/api/platform-admin/users/${id}`,
      method: "PATCH",
      statusCode: 200,
      ip,
      metadata: { changes: Object.keys(updates) },
    });

    return { message: "Usuário atualizado com sucesso" };
  }

  async resetPassword(
    id: string,
    dto: AdminResetPasswordDto,
    adminUserId: string,
    ip?: string,
  ) {
    const { sendEmail } = dto;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    if (sendEmail) {
      // TODO: Gerar token e enviar email
      this.auditService.log({
        userId: adminUserId,
        action: "PASSWORD_RESET_REQUESTED",
        resource: `/api/platform-admin/users/${id}/reset-password`,
        method: "POST",
        ip,
        metadata: { targetUserId: id, method: "email" },
      });

      return { message: "Email de reset enviado" };
    } else {
      // Gerar senha temporária
      const tempPassword = this.generateSecurePassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, id));

      // Revogar todos os tokens
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, id));

      this.auditService.log({
        userId: adminUserId,
        action: "PASSWORD_RESET_MANUAL",
        resource: `/api/platform-admin/users/${id}/reset-password`,
        method: "POST",
        ip,
        metadata: { targetUserId: id, method: "temporary" },
      });

      return {
        temporaryPassword: tempPassword,
        message: "Senha temporária gerada. Usuário deve alterá-la no primeiro login.",
      };
    }
  }

  async forceVerifyEmail(id: string, adminUserId: string, ip?: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, id));

    this.auditService.log({
      userId: adminUserId,
      action: "VERIFY_EMAIL",
      resource: `/api/platform-admin/users/${id}/verify-email`,
      method: "POST",
      ip,
      metadata: { targetUserId: id },
    });

    return { message: "Email marcado como verificado" };
  }

  async addToClinic(
    userId: string,
    dto: AddUserClinicDto,
    adminUserId: string,
    ip?: string,
  ) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, dto.clinicId))
      .limit(1);

    if (!clinic) {
      throw new NotFoundException("Clínica não encontrada");
    }

    // Verificar se já existe
    const existing = await db
      .select()
      .from(userClinicRoles)
      .where(
        and(
          eq(userClinicRoles.userId, userId),
          eq(userClinicRoles.clinicId, dto.clinicId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException("Usuário já está nesta clínica");
    }

    await db.insert(userClinicRoles).values({
      userId,
      clinicId: dto.clinicId,
      role: dto.role,
    });

    this.auditService.log({
      userId: adminUserId,
      action: "ADD_USER_CLINIC",
      resource: `/api/platform-admin/users/${userId}/clinics`,
      method: "POST",
      ip,
      metadata: { targetUserId: userId, clinicId: dto.clinicId, role: dto.role },
    });

    return { message: "Usuário adicionado à clínica" };
  }

  async updateClinicRole(
    userId: string,
    clinicId: string,
    dto: UpdateUserClinicDto,
    adminUserId: string,
    ip?: string,
  ) {
    const existing = await db
      .select()
      .from(userClinicRoles)
      .where(
        and(
          eq(userClinicRoles.userId, userId),
          eq(userClinicRoles.clinicId, clinicId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException("Associação não encontrada");
    }

    await db
      .update(userClinicRoles)
      .set({ role: dto.role })
      .where(
        and(
          eq(userClinicRoles.userId, userId),
          eq(userClinicRoles.clinicId, clinicId),
        ),
      );

    this.auditService.log({
      userId: adminUserId,
      action: "UPDATE_USER_CLINIC_ROLE",
      resource: `/api/platform-admin/users/${userId}/clinics/${clinicId}`,
      method: "PATCH",
      ip,
      metadata: { targetUserId: userId, clinicId, newRole: dto.role },
    });

    return { message: "Role atualizado" };
  }

  async removeFromClinic(
    userId: string,
    clinicId: string,
    adminUserId: string,
    ip?: string,
  ) {
    await db
      .delete(userClinicRoles)
      .where(
        and(
          eq(userClinicRoles.userId, userId),
          eq(userClinicRoles.clinicId, clinicId),
        ),
      );

    this.auditService.log({
      userId: adminUserId,
      action: "REMOVE_USER_CLINIC",
      resource: `/api/platform-admin/users/${userId}/clinics/${clinicId}`,
      method: "DELETE",
      ip,
      metadata: { targetUserId: userId, clinicId },
    });

    return { message: "Usuário removido da clínica" };
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    adminUserId: string,
    ip?: string,
  ) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    const updates: any = {
      status: dto.status,
      updatedAt: new Date(),
    };

    if (dto.status === "inactive") {
      updates.deactivatedAt = new Date();
      updates.deactivatedBy = adminUserId;
      updates.deactivationReason = dto.reason || null;
    } else {
      updates.deactivatedAt = null;
      updates.deactivatedBy = null;
      updates.deactivationReason = null;
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    if (dto.revokeTokens) {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    }

    this.auditService.log({
      userId: adminUserId,
      action: dto.status === "active" ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      resource: `/api/platform-admin/users/${id}/status`,
      method: "PATCH",
      ip,
      metadata: {
        targetUserId: id,
        status: dto.status,
        reason: dto.reason,
        revokedTokens: dto.revokeTokens,
      },
    });

    return {
      message: `Usuário ${dto.status === "active" ? "ativado" : "desativado"} com sucesso`,
    };
  }

  async resendInvite(
    userId: string,
    adminUserId: string,
    ip?: string,
  ): Promise<{ message: string }> {
    // 1. Buscar usuário
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new NotFoundException("Usuário não encontrado");
    }

    // 2. Buscar convite pendente (latest)
    const pendingInvites = await db
      .select()
      .from(invites)
      .where(and(eq(invites.email, user[0].email), isNull(invites.usedAt)))
      .orderBy(desc(invites.createdAt))
      .limit(1);

    if (pendingInvites.length === 0) {
      throw new NotFoundException(
        "Nenhum convite pendente encontrado para este usuário",
      );
    }

    const invite = pendingInvites[0];

    // 3. Verificar se convite já foi usado (double-check)
    if (invite.usedAt) {
      throw new BadRequestException(
        "Convite já foi aceito. O usuário já possui uma conta.",
      );
    }

    // 4. Gerar novo token e estender validade
    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // 5. Atualizar convite
    await db
      .update(invites)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
      })
      .where(eq(invites.id, invite.id));

    // 6. Buscar dados da clínica e organização para email
    const clinic = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, invite.clinicId))
      .limit(1);

    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invite.organizationId))
      .limit(1);

    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);

    // 7. Enviar email (fire-and-forget)
    this.mailService
      .sendInviteEmail(
        invite.email,
        newToken,
        admin[0]?.name || "Administrador",
        organization[0]?.name || "Healz",
        invite.role,
      )
      .catch((err) => {
        console.error("Erro ao enviar email de convite:", err);
      });

    // 8. Log de auditoria
    await this.auditService.log({
      action: "RESEND_INVITE",
      userId: adminUserId,
      resource: `/api/platform-admin/users/${userId}/resend-invite`,
      method: "POST",
      ip,
      metadata: {
        targetUserId: userId,
        email: invite.email,
        clinicId: invite.clinicId,
        organizationId: invite.organizationId,
      },
    });

    return { message: "Convite reenviado com sucesso" };
  }

  private generateSecurePassword(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    return Array.from({ length: 12 }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  }
}
