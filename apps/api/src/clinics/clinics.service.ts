import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/connection";
import { clinic, clinicUser, member, session } from "../db/schema";
import { CreateClinicDto } from "./dto/create-clinic.dto";

@Injectable()
export class ClinicsService {
  async create(orgId: string, userId: string, dto: CreateClinicDto) {
    // Verificar se usuário é admin ou manager
    const membership = await db.query.member.findFirst({
      where: and(eq(member.userId, userId), eq(member.organizationId, orgId)),
    });

    if (!membership || !["admin", "manager"].includes(membership.role)) {
      throw new ForbiddenException("Only admin or manager can create clinics");
    }

    const clinicId = uuidv4();

    // Criar clínica
    await db.insert(clinic).values({
      id: clinicId,
      organizationId: orgId,
      name: dto.name,
      slug: dto.slug,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      timezone: dto.timezone || "America/Sao_Paulo",
      status: "active",
    });

    // Adicionar criador como admin na clínica
    await db.insert(clinicUser).values({
      id: uuidv4(),
      clinicId,
      userId,
      role: "admin",
      status: "active",
    });

    return {
      id: clinicId,
      name: dto.name,
      slug: dto.slug,
      status: "active",
    };
  }

  async findByOrg(orgId: string) {
    return db.query.clinic.findMany({
      where: eq(clinic.organizationId, orgId),
    });
  }

  async findOne(clinicId: string, userId: string, orgId: string) {
    // Verificar se clínica pertence à org
    const clinicData = await db.query.clinic.findFirst({
      where: and(eq(clinic.id, clinicId), eq(clinic.organizationId, orgId)),
    });

    if (!clinicData) {
      throw new NotFoundException("Clinic not found in this organization");
    }

    // Verificar se usuário tem acesso
    const access = await db.query.clinicUser.findFirst({
      where: and(
        eq(clinicUser.userId, userId),
        eq(clinicUser.clinicId, clinicId)
      ),
    });

    if (!access) {
      throw new ForbiddenException("Access denied to this clinic");
    }

    return clinicData;
  }

  async setActive(
    sessionId: string,
    clinicId: string,
    userId: string,
    orgId: string
  ) {
    // Verificar acesso
    await this.findOne(clinicId, userId, orgId);

    // Atualizar sessão
    await db
      .update(session)
      .set({
        activeClinicId: clinicId,
      })
      .where(eq(session.id, sessionId));

    return { success: true, activeClinicId: clinicId };
  }

  async getUserClinicsByOrg(userId: string, orgId: string) {
    const clinicUsers = await db.query.clinicUser.findMany({
      where: eq(clinicUser.userId, userId),
      with: {
        clinic: true,
      },
    });

    return clinicUsers
      .filter((cu) => cu.clinic && cu.clinic.organizationId === orgId)
      .map((cu) => cu.clinic);
  }
}
