import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import { clinics, userClinicRoles, doctorProfiles } from '../../infrastructure/database/schema'
import { JwtPayload } from '../interfaces/jwt-payload.interface'

/**
 * Permite acesso se o usuário pertence à clínica (qualquer role).
 * Médicos só podem acessar seu próprio doctorId.
 */
@Injectable()
export class IsClinicMemberGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user: JwtPayload = request.user
    const clinicId = request.params.clinicId
    const doctorId = request.params.doctorId

    const [clinic] = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1)

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada')
    }

    const [membership] = await db
      .select({ role: userClinicRoles.role })
      .from(userClinicRoles)
      .where(
        and(
          eq(userClinicRoles.userId, user.userId),
          eq(userClinicRoles.clinicId, clinicId),
        ),
      )
      .limit(1)

    if (!membership) {
      throw new ForbiddenException('Você não tem acesso a esta clínica')
    }

    if (membership.role === 'doctor' && doctorId) {
      const [selfDoctor] = await db
        .select({ id: doctorProfiles.id })
        .from(doctorProfiles)
        .where(
          and(
            eq(doctorProfiles.id, doctorId),
            eq(doctorProfiles.userId, user.userId),
          ),
        )
        .limit(1)

      if (!selfDoctor) {
        throw new ForbiddenException('Médicos só podem visualizar a própria agenda')
      }
    }

    return true
  }
}
