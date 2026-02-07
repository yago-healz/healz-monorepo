import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db";
import { clinics, userClinicRoles } from "../../db/schema";
import { JwtPayload } from "../../auth/interfaces/jwt-payload.interface";

@Injectable()
export class IsClinicAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const clinicId = request.params.clinicId;

    // Buscar clinic
    const clinic = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (clinic.length === 0) {
      throw new NotFoundException("Clínica não encontrada");
    }

    // Verificar se é admin da clinic ou admin da org
    const adminAccess = await db
      .select()
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, user.userId),
          or(
            // Admin da clinic específica
            and(
              eq(userClinicRoles.clinicId, clinicId),
              eq(userClinicRoles.role, "admin"),
            ),
            // Admin de qualquer clinic da mesma org
            and(
              eq(clinics.organizationId, clinic[0].organizationId),
              eq(userClinicRoles.role, "admin"),
            ),
          ),
        ),
      )
      .limit(1);

    if (adminAccess.length === 0) {
      throw new ForbiddenException(
        "Apenas administradores da organização ou clínica podem realizar esta ação",
      );
    }

    return true;
  }
}
