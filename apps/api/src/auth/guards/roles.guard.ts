import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { db } from '../../db/connection';
import { eq, and } from 'drizzle-orm';
import { member } from '../../db/schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const { user, session } = request;

    if (!user || !session.activeOrganizationId) {
      throw new ForbiddenException('No active organization context');
    }

    // Buscar role do usuário na org atual
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, user.id),
        eq(member.organizationId, session.activeOrganizationId),
      ),
    });

    if (!membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    request.membership = membership;
    return true;
  }
}
