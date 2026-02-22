import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  and,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../../infrastructure/database";
import {
  clinics,
  organizations,
  userClinicRoles,
  users,
} from "../../infrastructure/database/schema";
import { AuditService } from "../../infrastructure/audit/audit.service";
import { MailService } from "../../infrastructure/mail/mail.service";
import { InvitesService } from "../../invites/invites.service";
import { ListOrganizationsQueryDto } from "../dto/organizations/list-organizations-query.dto";
import { CreateOrganizationDto } from "../dto/organizations/create-organization.dto";
import { UpdateOrganizationDto } from "../dto/organizations/update-organization.dto";
import { UpdateOrgStatusDto } from "../dto/organizations/update-org-status.dto";
import {
  calculatePagination,
  buildPaginatedResponse,
} from "../utils/pagination.helper";

@Injectable()
export class PlatformAdminOrganizationsService {
  constructor(
    private auditService: AuditService,
    private mailService: MailService,
    private invitesService: InvitesService,
  ) {}

  async list(query: ListOrganizationsQueryDto, adminUserId: string) {
    const { page = 1, limit = 20, search, status = "active", sortBy = "createdAt", sortOrder = "desc" } = query;
    const { limit: take, offset: skip } = calculatePagination(page, limit);

    // Build WHERE clause
    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(organizations.status, status as "active" | "inactive"));
    }

    if (search) {
      conditions.push(
        or(
          ilike(organizations.name, `%${search}%`),
          ilike(organizations.slug, `%${search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(whereClause);

    // Get paginated data with stats
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        createdAt: organizations.createdAt,
        clinicsCount: sql<number>`count(DISTINCT ${clinics.id})::int`,
        usersCount: sql<number>`count(DISTINCT ${userClinicRoles.userId})::int`,
      })
      .from(organizations)
      .leftJoin(clinics, eq(organizations.id, clinics.organizationId))
      .leftJoin(userClinicRoles, eq(clinics.id, userClinicRoles.clinicId))
      .where(whereClause)
      .groupBy(organizations.id)
      .limit(take)
      .offset(skip);

    // Aplicar ordenação manualmente (Drizzle não suporta bem ordenação com agregações)
    orgs.sort((a, b) => {
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

    // Log audit
    this.auditService.log({
      userId: adminUserId,
      action: "READ",
      resource: "/api/platform-admin/organizations",
      method: "GET",
      statusCode: 200,
    });

    return buildPaginatedResponse(
      orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status,
        createdAt: o.createdAt,
        stats: {
          clinicsCount: o.clinicsCount,
          usersCount: o.usersCount,
        },
      })),
      count,
      page,
      limit,
    );
  }

  async getById(id: string, adminUserId: string) {
    // Fetch org
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!org) {
      throw new NotFoundException("Organização não encontrada");
    }

    // Fetch clinics with user count
    const orgClinics = await db
      .select({
        id: clinics.id,
        name: clinics.name,
        status: clinics.status,
        usersCount: sql<number>`count(DISTINCT ${userClinicRoles.userId})::int`,
      })
      .from(clinics)
      .leftJoin(userClinicRoles, eq(clinics.id, userClinicRoles.clinicId))
      .where(eq(clinics.organizationId, id))
      .groupBy(clinics.id);

    // Fetch organization admins
    const orgAdmins = await db
      .select({
        userId: userClinicRoles.userId,
        name: users.name,
        email: users.email,
      })
      .from(userClinicRoles)
      .innerJoin(users, eq(userClinicRoles.userId, users.id))
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(clinics.organizationId, id),
          eq(userClinicRoles.role, "admin"),
        ),
      );

    // Get unique admins
    const uniqueAdmins = Array.from(
      new Map(orgAdmins.map((a) => [a.userId, a])).values(),
    );

    // Fetch stats
    const [{ totalUsers, totalClinics }] = await db
      .select({
        totalUsers: sql<number>`count(DISTINCT ${userClinicRoles.userId})::int`,
        totalClinics: sql<number>`count(DISTINCT ${clinics.id})::int`,
      })
      .from(clinics)
      .leftJoin(userClinicRoles, eq(clinics.id, userClinicRoles.clinicId))
      .where(eq(clinics.organizationId, id));

    // Log audit
    this.auditService.log({
      userId: adminUserId,
      action: "READ",
      resource: `/api/platform-admin/organizations/${id}`,
      method: "GET",
      statusCode: 200,
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      clinics: orgClinics,
      admins: uniqueAdmins,
      stats: {
        totalUsers,
        totalClinics,
      },
    };
  }

  async create(
    dto: CreateOrganizationDto,
    adminUserId: string,
    ip?: string,
  ) {
    const { name, slug, status, initialClinic, initialAdmin } = dto;

    // Verificar se slug já existe
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existingOrg.length > 0) {
      throw new BadRequestException("Slug já existe");
    }

    // Transação: apenas org + clinic
    const { newOrg, newClinic } = await db.transaction(async (tx) => {
      // 1. Criar organização
      const [newOrg] = await tx
        .insert(organizations)
        .values({
          name,
          slug,
          status: status ?? "active",
        })
        .returning();

      // 2. Criar clínica inicial
      const [newClinic] = await tx
        .insert(clinics)
        .values({
          organizationId: newOrg.id,
          name: initialClinic.name,
          status: "active",
        })
        .returning();

      return { newOrg, newClinic };
    });

    // 3. Invite ou criação direta (fora da transação, dados commitados)
    let inviteInfo = null;
    let createdAdminId: string | null = null;

    if (initialAdmin.sendInvite) {
      // sendInvite cria apenas o registro de invite + envia email
      // acceptInvite criará usuário + userClinicRole depois
      inviteInfo = await this.invitesService.sendInvite(
        adminUserId,
        newOrg.id,
        {
          name: initialAdmin.name,
          email: initialAdmin.email,
          clinicId: newClinic.id,
          role: "admin",
        },
        ip,
      );
    } else {
      // Sem invite: criar usuário + role diretamente
      const newUserResult = await db
        .insert(users)
        .values({
          email: initialAdmin.email,
          name: initialAdmin.name,
          passwordHash: "",
          status: "active",
        })
        .returning();
      const newUser = (newUserResult as any[])[0];
      createdAdminId = newUser.id;

      await db.insert(userClinicRoles).values({
        userId: newUser.id,
        clinicId: newClinic.id,
        role: "admin",
      });
    }

    // 4. Log audit
    this.auditService.log({
      userId: adminUserId,
      action: "CREATE",
      resource: "/api/platform-admin/organizations",
      method: "POST",
      statusCode: 201,
      ip,
      metadata: {
        orgId: newOrg.id,
        orgName: name,
        clinicId: newClinic.id,
        adminEmail: initialAdmin.email,
      },
    });

    return {
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        status: newOrg.status,
      },
      clinic: {
        id: newClinic.id,
        name: newClinic.name,
      },
      admin: {
        id: createdAdminId, // null quando sendInvite:true (usuário ainda não existe)
        email: initialAdmin.email,
        name: initialAdmin.name,
      },
      invite: inviteInfo,
    };
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    adminUserId: string,
    ip?: string,
  ) {
    // Verificar se org existe
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!org) {
      throw new NotFoundException("Organização não encontrada");
    }

    // Se mudar slug, verificar se já existe
    if (dto.slug && dto.slug !== org.slug) {
      const existingOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, dto.slug))
        .limit(1);

      if (existingOrg.length > 0) {
        throw new BadRequestException("Slug já existe");
      }
    }

    // Atualizar
    const updates: any = {
      updatedAt: new Date(),
    };

    if (dto.name) updates.name = dto.name;
    if (dto.slug) updates.slug = dto.slug;
    if (dto.status) updates.status = dto.status;

    await db.transaction(async (tx) => {
      await tx
        .update(organizations)
        .set(updates)
        .where(eq(organizations.id, id));

      // Se desativando, desativar todas as clínicas
      if (dto.status === "inactive") {
        await tx
          .update(clinics)
          .set({ status: "inactive", updatedAt: new Date() })
          .where(eq(clinics.organizationId, id));
      }
    });

    // Log audit
    this.auditService.log({
      userId: adminUserId,
      action: "UPDATE",
      resource: `/api/platform-admin/organizations/${id}`,
      method: "PATCH",
      statusCode: 200,
      ip,
      metadata: {
        changes: Object.keys(updates),
      },
    });

    return { message: "Organização atualizada com sucesso" };
  }

  async updateStatus(
    id: string,
    dto: UpdateOrgStatusDto,
    adminUserId: string,
    ip?: string,
  ) {
    // Verificar se org existe
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!org) {
      throw new NotFoundException("Organização não encontrada");
    }

    // Usar transação
    return await db.transaction(async (tx) => {
      // 1. Atualizar status da organização
      await tx
        .update(organizations)
        .set({
          status: dto.status,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, id));

      // 2. Se desativando, desativar todas as clínicas
      if (dto.status === "inactive") {
        await tx
          .update(clinics)
          .set({
            status: "inactive",
            updatedAt: new Date(),
          })
          .where(eq(clinics.organizationId, id));
      }

      // 3. Log audit
      this.auditService.log({
        userId: adminUserId,
        action: dto.status === "active" ? "ORG_ACTIVATED" : "ORG_DEACTIVATED",
        resource: `/api/platform-admin/organizations/${id}/status`,
        method: "PATCH",
        statusCode: 200,
        ip,
        metadata: {
          orgId: id,
          status: dto.status,
          reason: dto.reason,
        },
      });

      return {
        message: `Organização ${dto.status === "active" ? "ativada" : "desativada"} com sucesso`,
      };
    });
  }
}
