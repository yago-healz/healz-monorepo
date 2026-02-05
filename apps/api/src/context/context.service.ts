import { Injectable, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { member, clinic, clinicUser, session } from '../db/schema';
import { SwitchContextDto } from './dto';

@Injectable()
export class ContextService {
  async getCurrentContext(userId: string, currentSession: any) {
    // Se não há contexto ativo, retornar null
    if (!currentSession?.activeOrganizationId) {
      return {
        organization: null,
        clinic: null,
      };
    }

    // Buscar organização ativa
    const orgMembership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, currentSession.activeOrganizationId),
      ),
      with: {
        organization: true,
      },
    });

    if (!orgMembership) {
      return {
        organization: null,
        clinic: null,
      };
    }

    // Se há clínica ativa, buscar seus dados
    let clinicData = null;
    if (currentSession.activeClinicId) {
      clinicData = await db.query.clinic.findFirst({
        where: and(
          eq(clinic.id, currentSession.activeClinicId),
          eq(clinic.organizationId, currentSession.activeOrganizationId),
        ),
      });
    }

    return {
      organization: orgMembership.organization,
      clinic: clinicData,
      role: orgMembership.role,
    };
  }

  async getAvailableContexts(userId: string) {
    // Buscar todas as organizações do usuário
    const memberships = await db.query.member.findMany({
      where: eq(member.userId, userId),
      with: {
        organization: true,
      },
    });

    // Para cada organização, buscar as clínicas que o usuário tem acesso
    const contextsWithClinics = await Promise.all(
      memberships.map(async (m) => {
        const userClinics = await db.query.clinicUser.findMany({
          where: eq(clinicUser.userId, userId),
          with: {
            clinic: true,
          },
        });

        // Filtrar apenas clínicas da organização atual
        const orgClinics = userClinics.filter(
          (cu) => cu.clinic && cu.clinic.organizationId === m.organizationId,
        );

        return {
          organization: m.organization,
          role: m.role,
          clinics: orgClinics.map((cu) => ({
            id: cu.clinic!.id,
            name: cu.clinic!.name,
            slug: cu.clinic!.slug,
            role: cu.role,
          })),
        };
      }),
    );

    return contextsWithClinics;
  }

  async switchContext(
    sessionId: string,
    userId: string,
    dto: SwitchContextDto,
  ) {
    // Verificar se usuário é membro da organização
    const orgMembership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, dto.organizationId),
      ),
    });

    if (!orgMembership) {
      throw new ForbiddenException(
        'Access denied to this organization',
      );
    }

    // Se clinicId foi fornecido, verificar acesso
    if (dto.clinicId) {
      // Verificar se clínica pertence à organização
      const clinicData = await db.query.clinic.findFirst({
        where: and(
          eq(clinic.id, dto.clinicId),
          eq(clinic.organizationId, dto.organizationId),
        ),
      });

      if (!clinicData) {
        throw new ForbiddenException(
          'Clinic not found in this organization',
        );
      }

      // Verificar se usuário tem acesso à clínica
      const clinicAccess = await db.query.clinicUser.findFirst({
        where: and(
          eq(clinicUser.userId, userId),
          eq(clinicUser.clinicId, dto.clinicId),
        ),
      });

      if (!clinicAccess) {
        throw new ForbiddenException(
          'Access denied to this clinic',
        );
      }
    }

    // Atualizar sessão
    await db
      .update(session)
      .set({
        activeOrganizationId: dto.organizationId,
        activeClinicId: dto.clinicId || null,
      })
      .where(eq(session.id, sessionId));

    return {
      success: true,
      activeOrganizationId: dto.organizationId,
      activeClinicId: dto.clinicId || null,
    };
  }
}
