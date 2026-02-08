import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { clinics, userClinicRoles } from "../../db/schema";
import { JwtPayload } from "../../auth/interfaces/jwt-payload.interface";

@Injectable()
export class IsOrgAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user.organizationId) {
      throw new ForbiddenException(
        "Usuário não está vinculado a nenhuma organização",
      );
    }

    // Verificar se o usuário autenticado é admin da organização atual
    const adminAccess = await db
      .select()
      .from(userClinicRoles)
      .innerJoin(clinics, eq(userClinicRoles.clinicId, clinics.id))
      .where(
        and(
          eq(userClinicRoles.userId, user.userId),
          eq(clinics.organizationId, user.organizationId),
          eq(userClinicRoles.role, "admin"),
        ),
      )
      .limit(1);

    if (adminAccess.length === 0) {
      throw new ForbiddenException(
        "Apenas administradores podem realizar esta ação",
      );
    }

    return true;
  }
}
