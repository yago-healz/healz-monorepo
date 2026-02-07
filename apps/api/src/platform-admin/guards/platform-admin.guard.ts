import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { platformAdmins } from "../../db/schema";
import { JwtPayload } from "../../auth/interfaces/jwt-payload.interface";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.userId) {
      throw new ForbiddenException("Não autenticado");
    }

    const admin = await db
      .select()
      .from(platformAdmins)
      .where(
        and(
          eq(platformAdmins.userId, user.userId),
          isNull(platformAdmins.revokedAt),
        ),
      )
      .limit(1);

    if (admin.length === 0) {
      throw new ForbiddenException(
        "Acesso exclusivo para administradores da plataforma",
      );
    }

    return true;
  }
}
