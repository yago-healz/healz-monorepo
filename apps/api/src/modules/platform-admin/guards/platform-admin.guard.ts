import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { JwtPayload } from "../../../common/interfaces/jwt-payload.interface";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user?.userId || !user?.isPlatformAdmin) {
      throw new ForbiddenException(
        "Acesso exclusivo para administradores da plataforma",
      );
    }

    return true;
  }
}
