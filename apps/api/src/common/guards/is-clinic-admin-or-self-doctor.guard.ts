import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../infrastructure/database";
import {
  clinics,
  userClinicRoles,
  doctorProfiles,
} from "../../infrastructure/database/schema";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class IsClinicAdminOrSelfDoctorGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const clinicId = request.params.clinicId;
    const doctorId = request.params.doctorId;

    // Buscar clinic
    const clinic = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (clinic.length === 0) {
      throw new NotFoundException("Clínica não encontrada");
    }

    // Verificar se é admin da org ou manager desta clínica
    const adminAccess = await db
      .select()
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, user.userId),
          or(
            and(
              eq(clinics.organizationId, clinic[0].organizationId),
              eq(userClinicRoles.role, "admin"),
            ),
            and(
              eq(userClinicRoles.clinicId, clinicId),
              eq(userClinicRoles.role, "manager"),
            ),
          ),
        ),
      )
      .limit(1);

    if (adminAccess.length > 0) return true;

    // Verificar se o doctorId pertence ao userId do JWT
    if (!doctorId) {
      throw new ForbiddenException("Acesso negado");
    }

    const selfDoctor = await db
      .select({ id: doctorProfiles.id })
      .from(doctorProfiles)
      .where(
        and(
          eq(doctorProfiles.id, doctorId),
          eq(doctorProfiles.userId, user.userId),
        ),
      )
      .limit(1);

    if (selfDoctor.length === 0) {
      throw new ForbiddenException("Você só pode editar seus próprios dados");
    }

    return true;
  }
}
