import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { addDays as addDaysHelper } from "date-fns";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/connection";
import { invitation, member, user } from "../db/schema";
import { InviteMemberDto } from "./dto";

@Injectable()
export class MembersService {
  async findByOrg(orgId: string) {
    return db.query.member.findMany({
      where: eq(member.organizationId, orgId),
      with: {
        user: true,
      },
    });
  }

  async invite(orgId: string, dto: InviteMemberDto, inviterId: string) {
    // Verificar se convidante é admin ou manager
    const inviterMembership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, inviterId),
        eq(member.organizationId, orgId)
      ),
    });

    if (
      !inviterMembership ||
      !["admin", "manager"].includes(inviterMembership.role)
    ) {
      throw new ForbiddenException("Only admin or manager can invite members");
    }

    // Verificar se usuário já é membro
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, dto.email),
    });

    if (existingUser) {
      const existingMember = await db.query.member.findFirst({
        where: and(
          eq(member.userId, existingUser.id),
          eq(member.organizationId, orgId)
        ),
      });

      if (existingMember) {
        throw new ForbiddenException(
          "User is already a member of this organization"
        );
      }

      // Adicionar como membro direto
      const memberId = nanoid();
      await db.insert(member).values({
        id: memberId,
        organizationId: orgId,
        userId: existingUser.id,
        role: dto.role || "receptionist",
      });

      return {
        id: memberId,
        email: dto.email,
        role: dto.role || "receptionist",
        status: "active",
      };
    }

    // Criar convite pendente
    const invitationId = nanoid();
    const expiresAt = addDaysHelper(new Date(), 7); // 7 dias

    await db.insert(invitation).values({
      id: invitationId,
      organizationId: orgId,
      email: dto.email,
      role: dto.role || "receptionist",
      status: "pending",
      expiresAt,
      inviterId,
    });

    return {
      id: invitationId,
      email: dto.email,
      role: dto.role || "receptionist",
      status: "pending",
      expiresAt,
    };
  }

  async updateRole(memberId: string, newRole: string) {
    // Verificar se membro existe
    const memberData = await db.query.member.findFirst({
      where: eq(member.id, memberId),
    });

    if (!memberData) {
      throw new NotFoundException("Member not found");
    }

    await db
      .update(member)
      .set({ role: newRole as any })
      .where(eq(member.id, memberId));

    return { id: memberId, role: newRole };
  }

  async remove(memberId: string) {
    // Verificar se membro existe
    const memberData = await db.query.member.findFirst({
      where: eq(member.id, memberId),
    });

    if (!memberData) {
      throw new NotFoundException("Member not found");
    }

    // Impedir remover último admin
    const adminCount = await db.query.member.findMany({
      where: and(
        eq(member.organizationId, memberData.organizationId),
        eq(member.role, "admin")
      ),
    });

    if (adminCount.length === 1 && memberData.role === "admin") {
      throw new ForbiddenException(
        "Cannot remove the last admin from organization"
      );
    }

    await db.delete(member).where(eq(member.id, memberId));

    return { success: true };
  }
}
