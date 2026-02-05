import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { organization, member, session } from '../db/schema';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { nanoid } from 'nanoid';

@Injectable()
export class OrganizationsService {
  async create(userId: string, dto: CreateOrganizationDto) {
    const orgId = nanoid();

    // Criar organização
    await db.insert(organization).values({
      id: orgId,
      name: dto.name,
      slug: dto.slug,
      status: 'active',
    });

    // Adicionar criador como admin
    await db.insert(member).values({
      id: nanoid(),
      organizationId: orgId,
      userId,
      role: 'admin',
    });

    return { id: orgId, name: dto.name, slug: dto.slug, status: 'active' };
  }

  async findByUser(userId: string) {
    return db.query.member.findMany({
      where: eq(member.userId, userId),
      with: {
        organization: true,
      },
    });
  }

  async findOne(orgId: string, userId: string) {
    // Verificar se usuário tem acesso
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, orgId),
      ),
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, orgId),
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async setActive(sessionId: string, orgId: string, userId: string) {
    // Verificar se usuário tem acesso
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, orgId),
      ),
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Atualizar sessão
    await db
      .update(session)
      .set({
        activeOrganizationId: orgId,
        activeClinicId: null,
      })
      .where(eq(session.id, sessionId));

    return { success: true, activeOrganizationId: orgId };
  }

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto) {
    // Apenas admin pode atualizar
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, orgId),
      ),
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Only admins can update organization');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.slug) updateData.slug = dto.slug;
    if (dto.logo) updateData.logo = dto.logo;

    await db
      .update(organization)
      .set(updateData)
      .where(eq(organization.id, orgId));

    return this.findOne(orgId, userId);
  }
}
