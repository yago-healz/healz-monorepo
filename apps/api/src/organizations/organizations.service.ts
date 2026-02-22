import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db } from "../infrastructure/database";
import { clinics, organizations, userClinicRoles } from "../infrastructure/database/schema";
import { CreateClinicDto } from "./dto/create-clinic.dto";
import { ClinicResponseDto } from "./dto/clinic-response.dto";
import { AuditService } from "../infrastructure/audit/audit.service";

@Injectable()
export class OrganizationsService {
  constructor(private auditService: AuditService) {}

  async createClinic(
    organizationId: string,
    adminUserId: string,
    dto: CreateClinicDto,
    ip?: string,
  ): Promise<ClinicResponseDto> {
    // 1. Validar se org existe
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (org.length === 0) {
      throw new NotFoundException("Organização não encontrada");
    }

    // 2. Validar se usuário autenticado é admin da org
    const adminAccess = await db
      .select()
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, adminUserId),
          eq(clinics.organizationId, organizationId),
          eq(userClinicRoles.role, "admin"),
        ),
      )
      .limit(1);

    if (adminAccess.length === 0) {
      throw new ForbiddenException(
        "Apenas administradores da organização podem criar clínicas",
      );
    }

    // 3. Criar clinic vinculada à org
    const [clinic] = await db
      .insert(clinics)
      .values({
        name: dto.name,
        organizationId,
      })
      .returning();

    // 4. Criar userClinicRole (vincula criador como admin da nova clinic)
    await db.insert(userClinicRoles).values({
      userId: adminUserId,
      clinicId: clinic.id,
      role: "admin",
    });

    // 5. Log de auditoria
    this.auditService.log({
      userId: adminUserId,
      organizationId,
      clinicId: clinic.id,
      action: "CREATE",
      resource: `/api/organizations/${organizationId}/clinics`,
      method: "POST",
      statusCode: 201,
      ip,
      metadata: {
        clinicName: clinic.name,
      },
    });

    return {
      id: clinic.id,
      name: clinic.name,
      organizationId: clinic.organizationId,
      createdAt: clinic.createdAt!,
    };
  }
}
