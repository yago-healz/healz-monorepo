import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../../infrastructure/database";
import { clinics, organizations, userClinicRoles, users } from "../../../infrastructure/database/schema";
import { AuditService } from "../../../infrastructure/audit/audit.service";
import { ListClinicsQueryDto } from "../dto/clinics/list-clinics-query.dto";
import { PlatformAdminCreateClinicDto } from "../dto/clinics/create-clinic.dto";
import { UpdateClinicDto } from "../dto/clinics/update-clinic.dto";
import { TransferClinicDto } from "../dto/clinics/transfer-clinic.dto";
import { UpdateClinicStatusDto } from "../dto/clinics/update-clinic-status.dto";
import {
  calculatePagination,
  buildPaginatedResponse,
} from "../utils/pagination.helper";

@Injectable()
export class PlatformAdminClinicsService {
  constructor(private auditService: AuditService) {}

  async list(query: ListClinicsQueryDto, adminUserId: string) {
    const { page = 1, limit = 20, search, status = "active", organizationId, sortBy = "createdAt", sortOrder = "desc" } = query;
    const { limit: take, offset: skip } = calculatePagination(page, limit);

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(clinics.status, status as "active" | "inactive"));
    }

    if (organizationId) {
      conditions.push(eq(clinics.organizationId, organizationId));
    }

    if (search) {
      conditions.push(ilike(clinics.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clinics)
      .where(whereClause);

    // Data
    const clinicsData = await db
      .select({
        id: clinics.id,
        name: clinics.name,
        status: clinics.status,
        organizationId: clinics.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        createdAt: clinics.createdAt,
        usersCount: sql<number>`count(DISTINCT ${userClinicRoles.userId})::int`,
      })
      .from(clinics)
      .innerJoin(organizations, eq(clinics.organizationId, organizations.id))
      .leftJoin(userClinicRoles, eq(clinics.id, userClinicRoles.clinicId))
      .where(whereClause)
      .groupBy(clinics.id, organizations.id)
      .limit(take)
      .offset(skip);

    // Sort
    clinicsData.sort((a, b) => {
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
      resource: "/api/platform-admin/clinics",
      method: "GET",
      statusCode: 200,
    });

    return buildPaginatedResponse(
      clinicsData.map((c) => ({
        id: c.id,
        name: c.name,
        organization: {
          id: c.organizationId,
          name: c.organizationName,
          slug: c.organizationSlug,
        },
        status: c.status,
        usersCount: c.usersCount,
        createdAt: c.createdAt,
      })),
      count,
      page,
      limit,
    );
  }

  async getById(id: string, adminUserId: string) {
    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!clinic) {
      throw new NotFoundException("Clínica não encontrada");
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, clinic.organizationId))
      .limit(1);

    const members = await db
      .select({
        userId: userClinicRoles.userId,
        name: users.name,
        email: users.email,
        role: userClinicRoles.role,
        joinedAt: userClinicRoles.createdAt,
      })
      .from(userClinicRoles)
      .innerJoin(users, eq(userClinicRoles.userId, users.id))
      .where(eq(userClinicRoles.clinicId, id));

    this.auditService.log({
      userId: adminUserId,
      action: "READ",
      resource: `/api/platform-admin/clinics/${id}`,
      method: "GET",
      statusCode: 200,
    });

    return {
      id: clinic.id,
      name: clinic.name,
      organization: {
        id: org!.id,
        name: org!.name,
        slug: org!.slug,
      },
      status: clinic.status,
      members,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    };
  }

  async create(dto: PlatformAdminCreateClinicDto, adminUserId: string, ip?: string) {
    // Verificar org existe e está ativa
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, dto.organizationId))
      .limit(1);

    if (!org) {
      throw new NotFoundException("Organização não encontrada");
    }

    if (org.status !== "active") {
      throw new BadRequestException("Organização está inativa");
    }

    // Se initialAdminId fornecido, validar antes de criar a clínica
    if (dto.initialAdminId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, dto.initialAdminId))
        .limit(1);

      if (!user) {
        throw new NotFoundException("Usuário admin inicial não encontrado");
      }
    }

    // Criar clínica e adicionar admin inicial em transação atômica
    const newClinic = await db.transaction(async (tx) => {
      const [clinic] = await tx
        .insert(clinics)
        .values({
          organizationId: dto.organizationId,
          name: dto.name,
          status: dto.status ?? "active",
        })
        .returning();

      if (dto.initialAdminId) {
        await tx.insert(userClinicRoles).values({
          userId: dto.initialAdminId,
          clinicId: clinic.id,
          role: "manager",
        });
      }

      return clinic;
    });

    this.auditService.log({
      userId: adminUserId,
      action: "CREATE",
      resource: "/api/platform-admin/clinics",
      method: "POST",
      statusCode: 201,
      ip,
      metadata: {
        clinicId: newClinic.id,
        organizationId: dto.organizationId,
      },
    });

    return {
      id: newClinic.id,
      name: newClinic.name,
      organizationId: dto.organizationId,
      status: newClinic.status,
    };
  }

  async update(
    id: string,
    dto: UpdateClinicDto,
    adminUserId: string,
    ip?: string,
  ) {
    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!clinic) {
      throw new NotFoundException("Clínica não encontrada");
    }

    const updates: any = { updatedAt: new Date() };
    if (dto.name) updates.name = dto.name;

    await db.update(clinics).set(updates).where(eq(clinics.id, id));

    this.auditService.log({
      userId: adminUserId,
      action: "UPDATE",
      resource: `/api/platform-admin/clinics/${id}`,
      method: "PATCH",
      statusCode: 200,
      ip,
      metadata: { changes: Object.keys(updates) },
    });

    return { message: "Clínica atualizada com sucesso" };
  }

  async transfer(
    id: string,
    dto: TransferClinicDto,
    adminUserId: string,
    ip?: string,
  ) {
    const { targetOrganizationId, keepUsers } = dto;

    return await db.transaction(async (tx) => {
      // 1. Verificar clinic existe
      const [clinic] = await tx
        .select()
        .from(clinics)
        .where(eq(clinics.id, id))
        .limit(1);

      if (!clinic) {
        throw new NotFoundException("Clínica não encontrada");
      }

      // 2. Verificar target org existe e está ativa
      const [targetOrg] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, targetOrganizationId))
        .limit(1);

      if (!targetOrg) {
        throw new NotFoundException("Organização destino não encontrada");
      }

      if (targetOrg.status !== "active") {
        throw new BadRequestException("Organização destino está inativa");
      }

      // 3. Atualizar organizationId
      await tx
        .update(clinics)
        .set({
          organizationId: targetOrganizationId,
          updatedAt: new Date(),
        })
        .where(eq(clinics.id, id));

      // 4. Se não mantiver usuários, deletar roles
      if (!keepUsers) {
        await tx
          .delete(userClinicRoles)
          .where(eq(userClinicRoles.clinicId, id));
      }

      // 5. Log audit
      this.auditService.log({
        userId: adminUserId,
        action: "TRANSFER_CLINIC",
        resource: `/api/platform-admin/clinics/${id}/transfer`,
        method: "PATCH",
        statusCode: 200,
        ip,
        metadata: {
          clinicId: id,
          fromOrgId: clinic.organizationId,
          toOrgId: targetOrganizationId,
          keepUsers,
        },
      });

      return { message: "Clínica transferida com sucesso" };
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateClinicStatusDto,
    adminUserId: string,
    ip?: string,
  ) {
    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!clinic) {
      throw new NotFoundException("Clínica não encontrada");
    }

    await db
      .update(clinics)
      .set({
        status: dto.status,
        updatedAt: new Date(),
      })
      .where(eq(clinics.id, id));

    this.auditService.log({
      userId: adminUserId,
      action: dto.status === "active" ? "CLINIC_ACTIVATED" : "CLINIC_DEACTIVATED",
      resource: `/api/platform-admin/clinics/${id}/status`,
      method: "PATCH",
      statusCode: 200,
      ip,
      metadata: {
        clinicId: id,
        status: dto.status,
        reason: dto.reason,
      },
    });

    return {
      message: `Clínica ${dto.status === "active" ? "ativada" : "desativada"} com sucesso`,
    };
  }
}
