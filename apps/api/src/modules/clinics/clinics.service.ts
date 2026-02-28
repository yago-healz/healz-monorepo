import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, ilike, or, isNull, gt, count, desc } from "drizzle-orm";
import { db } from "../../infrastructure/database";
import { clinics, userClinicRoles, users, invites, organizations } from "../../infrastructure/database/schema";
import { AddMemberDto } from "./dto/add-member.dto";
import { MemberResponseDto } from "./dto/member-response.dto";
import { AuditService } from "../../infrastructure/audit/audit.service";
import { MailService } from "../../infrastructure/mail/mail.service";
import { ListMembersQueryDto } from "./dto/list-members-query.dto";
import { ClinicMemberDto, ClinicMembersResponseDto } from "./dto/clinic-member-response.dto";

@Injectable()
export class ClinicsService {
  constructor(
    private auditService: AuditService,
    private mailService: MailService,
  ) {}

  async addMember(
    clinicId: string,
    adminUserId: string,
    dto: AddMemberDto,
    ip?: string,
  ): Promise<MemberResponseDto> {
    // 1. Validar se clinic existe
    const clinic = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (clinic.length === 0) {
      throw new NotFoundException("Clínica não encontrada");
    }

    // 2. Validar se user existe
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, dto.userId))
      .limit(1);

    if (user.length === 0) {
      throw new NotFoundException("Usuário não encontrado");
    }

    // 3. Validar se user já não está vinculado à clinic
    const existingMember = await db
      .select()
      .from(userClinicRoles)
      .where(
        and(
          eq(userClinicRoles.userId, dto.userId),
          eq(userClinicRoles.clinicId, clinicId),
        ),
      )
      .limit(1);

    if (existingMember.length > 0) {
      throw new BadRequestException("Usuário já está vinculado a esta clínica");
    }

    // 4. Criar userClinicRole
    const [member] = await db
      .insert(userClinicRoles)
      .values({
        userId: dto.userId,
        clinicId,
        role: dto.role as any,
      })
      .returning();

    // 5. Log de auditoria
    this.auditService.log({
      userId: adminUserId,
      organizationId: clinic[0].organizationId,
      clinicId,
      action: "CREATE",
      resource: `/api/clinics/${clinicId}/members`,
      method: "POST",
      statusCode: 201,
      ip,
      metadata: {
        addedUserId: dto.userId,
        addedUserEmail: user[0].email,
        role: dto.role,
      },
    });

    return {
      message: "Usuário adicionado à clínica com sucesso",
      member: {
        userId: member.userId,
        clinicId: member.clinicId,
        role: member.role,
      },
    };
  }

  async listMembers(
    clinicId: string,
    query: ListMembersQueryDto,
  ): Promise<ClinicMembersResponseDto> {
    const { search, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const memberSearch = search
      ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
      : undefined;

    const inviteSearch = search
      ? or(ilike(invites.name, `%${search}%`), ilike(invites.email, `%${search}%`))
      : undefined;

    // Contagens para o meta
    const [{ membersCount }] = await db
      .select({ membersCount: count() })
      .from(userClinicRoles)
      .innerJoin(users, eq(userClinicRoles.userId, users.id))
      .where(and(eq(userClinicRoles.clinicId, clinicId), memberSearch));

    const [{ invitesCount }] = await db
      .select({ invitesCount: count() })
      .from(invites)
      .where(
        and(
          eq(invites.clinicId, clinicId),
          isNull(invites.usedAt),
          gt(invites.expiresAt, new Date()),
          inviteSearch,
        ),
      );

    const total = Number(membersCount) + Number(invitesCount);
    const totalPages = Math.ceil(total / limit);

    // Membros ativos paginados (preenchem primeiro)
    const activeRows = await db
      .select({
        userId: userClinicRoles.userId,
        name: users.name,
        email: users.email,
        role: userClinicRoles.role,
        userStatus: users.status,
        emailVerified: users.emailVerified,
        joinedAt: userClinicRoles.createdAt,
      })
      .from(userClinicRoles)
      .innerJoin(users, eq(userClinicRoles.userId, users.id))
      .where(and(eq(userClinicRoles.clinicId, clinicId), memberSearch))
      .orderBy(desc(userClinicRoles.createdAt))
      .limit(limit)
      .offset(offset);

    const membersData: ClinicMemberDto[] = activeRows.map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      role: m.role,
      status: m.userStatus === "active" ? "active" : "inactive",
      emailVerified: m.emailVerified,
      joinedAt: m.joinedAt?.toISOString() ?? new Date().toISOString(),
    }));

    // Se a página já foi preenchida só com membros ativos, retorna
    if (membersData.length >= limit) {
      return { data: membersData, meta: { total, page, limit, totalPages } };
    }

    // Completa com convites pendentes nos slots restantes
    const remainingSlots = limit - membersData.length;
    const invitesOffset = Math.max(0, offset - Number(membersCount));

    const pendingRows = await db
      .select({
        id: invites.id,
        name: invites.name,
        email: invites.email,
        role: invites.role,
        createdAt: invites.createdAt,
      })
      .from(invites)
      .where(
        and(
          eq(invites.clinicId, clinicId),
          isNull(invites.usedAt),
          gt(invites.expiresAt, new Date()),
          inviteSearch,
        ),
      )
      .orderBy(desc(invites.createdAt))
      .limit(remainingSlots)
      .offset(invitesOffset);

    const invitesData: ClinicMemberDto[] = pendingRows.map((inv) => ({
      userId: inv.id,
      name: inv.name,
      email: inv.email,
      role: inv.role,
      status: "pending",
      emailVerified: false,
      joinedAt: inv.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    return {
      data: [...membersData, ...invitesData],
      meta: { total, page, limit, totalPages },
    };
  }

  async removeMember(clinicId: string, requestingUserId: string, targetUserId: string) {
    if (requestingUserId === targetUserId) {
      throw new BadRequestException("Você não pode remover a si mesmo");
    }

    const member = await db
      .select()
      .from(userClinicRoles)
      .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)))
      .limit(1);

    if (member.length === 0) throw new NotFoundException("Membro não encontrado");

    if (member[0].role === "admin") {
      const [{ adminCount }] = await db
        .select({ adminCount: count() })
        .from(userClinicRoles)
        .where(and(eq(userClinicRoles.clinicId, clinicId), eq(userClinicRoles.role, "admin")));

      if (Number(adminCount) <= 1) {
        throw new BadRequestException("Não é possível remover o último admin da clínica");
      }
    }

    await db
      .delete(userClinicRoles)
      .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)));

    return { message: "Membro removido com sucesso" };
  }

  async updateMemberRole(clinicId: string, targetUserId: string, role: string) {
    const member = await db
      .select()
      .from(userClinicRoles)
      .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)))
      .limit(1);

    if (member.length === 0) throw new NotFoundException("Membro não encontrado");

    if (member[0].role === "admin" && role !== "admin") {
      const [{ adminCount }] = await db
        .select({ adminCount: count() })
        .from(userClinicRoles)
        .where(and(eq(userClinicRoles.clinicId, clinicId), eq(userClinicRoles.role, "admin")));

      if (Number(adminCount) <= 1) {
        throw new BadRequestException("Não é possível rebaixar o último admin da clínica");
      }
    }

    await db
      .update(userClinicRoles)
      .set({ role: role as any })
      .where(and(eq(userClinicRoles.userId, targetUserId), eq(userClinicRoles.clinicId, clinicId)));

    return { message: "Cargo atualizado com sucesso", member: { userId: targetUserId, role } };
  }

  async resendInvite(clinicId: string, email: string) {
    const invite = await db
      .select()
      .from(invites)
      .where(and(eq(invites.clinicId, clinicId), eq(invites.email, email), isNull(invites.usedAt)))
      .limit(1);

    if (invite.length === 0) throw new NotFoundException("Convite pendente não encontrado");

    const now = new Date();
    let token = invite[0].token;

    if (invite[0].expiresAt < now) {
      token = crypto.randomUUID();
      await db
        .update(invites)
        .set({ token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
        .where(eq(invites.id, invite[0].id));
    }

    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, invite[0].invitedBy))
      .limit(1);

    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, invite[0].organizationId))
      .limit(1);

    await this.mailService.sendInviteEmail(
      invite[0].email,
      token,
      inviter?.name ?? "Administrador",
      org?.name ?? "Clínica",
      invite[0].role,
    );

    return { message: "Convite reenviado com sucesso" };
  }
}
