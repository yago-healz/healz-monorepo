import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db } from "../infrastructure/database";
import { clinics, userClinicRoles, users } from "../infrastructure/database/schema";
import { AddMemberDto } from "./dto/add-member.dto";
import { MemberResponseDto } from "./dto/member-response.dto";
import { AuditService } from "../infrastructure/audit/audit.service";

@Injectable()
export class ClinicsService {
  constructor(private auditService: AuditService) {}

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
}
