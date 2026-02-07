import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      "roles",
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // Verificar role na clínica ativa
    const activeClinicAccess = user.clinicAccess.find(
      (c) => c.clinicId === user.activeClinicId,
    );
    const role = activeClinicAccess?.role;
    return role !== undefined && requiredRoles.includes(role);
  }
}
