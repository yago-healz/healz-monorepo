import { db } from '../../index'
import { appointmentView } from '../../schema'
import type { SeedContext } from '../seed'
import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { SEED_CONFIG } from '../config'

const APPOINTMENT_REASONS = [
  'Consulta de avaliação',
  'Retorno pós-procedimento',
  'Botox – glabela e testa',
  'Preenchimento labial',
  'Limpeza de pele',
  'Clareamento dental',
  'Avaliação ortodôntica',
  'Manutenção aparelho',
  'Implante dentário – etapa 1',
  'Peeling químico',
  'Microagulhamento',
  'Consulta emergência',
]

// Doctor-to-clinic mapping for appointments
const DOCTOR_CLINIC_MAP: Array<{ doctorKey: string; clinicKey: string }> = [
  { doctorKey: 'dr_carlos', clinicKey: 'bellavita_sp' },
  { doctorKey: 'dr_carlos', clinicKey: 'bellavita_rj' },
  { doctorKey: 'dr_rafael', clinicKey: 'bellavita_sp' },
  { doctorKey: 'dr_rafael', clinicKey: 'bellavita_rj' },
  { doctorKey: 'dr_marcos', clinicKey: 'bellavita_rj' },
  { doctorKey: 'dr_lucia', clinicKey: 'smileplus' },
  { doctorKey: 'dr_ana', clinicKey: 'smileplus' },
]

function roundToSlot(date: Date): Date {
  const minutes = date.getMinutes()
  const rounded = Math.round(minutes / 30) * 30
  const result = new Date(date)
  result.setMinutes(rounded, 0, 0)
  return result
}

function setBusinessHour(date: Date): Date {
  const hour = faker.number.int({ min: 8, max: 17 })
  const result = new Date(date)
  result.setHours(hour, faker.helpers.arrayElement([0, 30]), 0, 0)
  return result
}

export async function seedAppointments(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding appointments...')

  const now = new Date()
  const pastStart = new Date(now.getTime() - SEED_CONFIG.APPOINTMENTS_PAST_DAYS * 24 * 60 * 60 * 1000)
  const futureEnd = new Date(now.getTime() + SEED_CONFIG.APPOINTMENTS_FUTURE_DAYS * 24 * 60 * 60 * 1000)

  // Status distribution
  const pastStatuses = [
    ...Array(60).fill('completed'),
    ...Array(20).fill('cancelled'),
    ...Array(10).fill('no_show'),
  ]
  const futureStatuses = [
    ...Array(30).fill('scheduled'),
    ...Array(15).fill('confirmed'),
  ]

  const allStatuses = [...pastStatuses, ...futureStatuses]
  const total = allStatuses.length

  let created = 0

  for (let i = 0; i < total; i++) {
    const status = allStatuses[i]
    const isPast = i < pastStatuses.length

    // Pick a random patient
    const patientId = faker.helpers.arrayElement(ctx.patientIds)
    const { clinicId, tenantId } = ctx.patientClinics[patientId]

    // Find a doctor that belongs to this clinic
    const matchingDoctors = DOCTOR_CLINIC_MAP.filter(
      (d) => ctx.clinicIds[d.clinicKey] === clinicId && ctx.userIds[d.doctorKey]
    )

    if (matchingDoctors.length === 0) continue

    const { doctorKey } = faker.helpers.arrayElement(matchingDoctors)
    const doctorId = ctx.userIds[doctorKey]

    const scheduledDate = isPast
      ? faker.date.between({ from: pastStart, to: now })
      : faker.date.between({ from: now, to: futureEnd })

    const scheduledAt = roundToSlot(setBusinessHour(scheduledDate))
    const duration = faker.helpers.arrayElement([30, 45, 60, 90])

    const createdAt = new Date(scheduledAt.getTime() - faker.number.int({ min: 1, max: 30 }) * 24 * 60 * 60 * 1000)

    const confirmedAt = ['confirmed', 'completed', 'no_show'].includes(status)
      ? new Date(createdAt.getTime() + faker.number.int({ min: 1, max: 24 }) * 60 * 60 * 1000)
      : null

    const cancelledAt = status === 'cancelled'
      ? new Date(scheduledAt.getTime() - faker.number.int({ min: 1, max: 48 }) * 60 * 60 * 1000)
      : null

    const completedAt = status === 'completed'
      ? new Date(scheduledAt.getTime() + duration * 60 * 1000)
      : null

    await db.insert(appointmentView).values({
      id: randomUUID(),
      patientId,
      tenantId,
      clinicId,
      doctorId,
      scheduledAt,
      duration,
      status,
      reason: faker.helpers.arrayElement(APPOINTMENT_REASONS),
      notes: Math.random() > 0.6 ? faker.lorem.sentence() : null,
      confirmedAt,
      cancelledAt,
      completedAt,
      createdAt,
      updatedAt: completedAt ?? cancelledAt ?? confirmedAt ?? createdAt,
    })

    created++
  }

  if (verbose) console.log(`  ✓ ${created} appointments created`)
}
