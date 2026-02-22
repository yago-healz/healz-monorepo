import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) return false;

    const user = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]?.emailVerified) {
      throw new ForbiddenException(
        "Email não verificado. Verifique seu email para continuar.",
      );
    }

    return true;
  }
}
