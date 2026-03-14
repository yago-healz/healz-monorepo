import { db } from '../../index'
import { invites } from '../../schema'
import type { SeedContext } from '../seed'
import { randomUUID } from 'crypto'

export async function seedInvites(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding invites...')

  const now = new Date()
  const inviterJoao = ctx.userIds['joao']
  const inviterPedro = ctx.userIds['pedro']
  const bellavitaSpId = ctx.clinicIds['bellavita_sp']
  const smilePlusId = ctx.clinicIds['smileplus']
  const bellavitaOrgId = ctx.organizationIds['bellavita']
  const smilePlusOrgId = ctx.organizationIds['smileplus']

  const invitesData = [
    // Aceito
    {
      email: 'novo.medico@bellavita.com',
      name: 'Dr. Novo Médico',
      token: randomUUID(),
      clinicId: bellavitaSpId,
      organizationId: bellavitaOrgId,
      role: 'doctor' as const,
      invitedBy: inviterJoao,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      usedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    // Aceito
    {
      email: 'recepcionista.nova@bellavita.com',
      name: 'Recepcionista Nova',
      token: randomUUID(),
      clinicId: bellavitaSpId,
      organizationId: bellavitaOrgId,
      role: 'receptionist' as const,
      invitedBy: inviterJoao,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      usedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    // Pendente
    {
      email: 'gerente.pendente@bellavita.com',
      name: 'Gerente Pendente',
      token: randomUUID(),
      clinicId: bellavitaSpId,
      organizationId: bellavitaOrgId,
      role: 'manager' as const,
      invitedBy: inviterJoao,
      expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      usedAt: null,
    },
    // Pendente
    {
      email: 'dentista.novo@smileplus.com',
      name: 'Dr. Dentista Novo',
      token: randomUUID(),
      clinicId: smilePlusId,
      organizationId: smilePlusOrgId,
      role: 'doctor' as const,
      invitedBy: inviterPedro,
      expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      usedAt: null,
    },
    // Expirado
    {
      email: 'expirado@bellavita.com',
      name: 'Convite Expirado',
      token: randomUUID(),
      clinicId: bellavitaSpId,
      organizationId: bellavitaOrgId,
      role: 'viewer' as const,
      invitedBy: inviterJoao,
      expiresAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      usedAt: null,
    },
  ]

  for (const invite of invitesData) {
    await db.insert(invites).values(invite)
  }

  if (verbose) console.log(`  ✓ ${invitesData.length} invites created`)
}
