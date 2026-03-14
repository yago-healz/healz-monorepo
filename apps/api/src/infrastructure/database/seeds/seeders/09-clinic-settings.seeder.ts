import { db } from '../../index'
import {
  clinicObjectives,
  clinicServices,
  clinicScheduling,
  clinicCarolSettings,
  clinicNotifications,
} from '../../schema'
import type { SeedContext } from '../seed'
import { CLINIC_OBJECTIVES_DATA, CLINIC_SERVICES_DATA, CAROL_SETTINGS_DATA } from '../data/clinic-settings.data'
import { randomUUID } from 'crypto'

function buildWeeklySchedule() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return days.map((day) => {
    if (day === 'sunday') return { day, isOpen: false, timeSlots: [] }
    if (day === 'saturday') {
      return {
        day,
        isOpen: true,
        timeSlots: [{ id: randomUUID(), from: '08:00', to: '12:00' }],
      }
    }
    return {
      day,
      isOpen: true,
      timeSlots: [
        { id: randomUUID(), from: '08:00', to: '12:00' },
        { id: randomUUID(), from: '14:00', to: '18:00' },
      ],
    }
  })
}

const ACTIVE_CLINICS = ['bellavita_sp', 'bellavita_rj', 'smileplus']

export async function seedClinicSettings(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding clinic settings...')

  for (const clinicKey of ACTIVE_CLINICS) {
    const clinicId = ctx.clinicIds[clinicKey]
    if (!clinicId) continue

    // Objectives
    const objData = CLINIC_OBJECTIVES_DATA[clinicKey]
    if (objData) {
      await db.insert(clinicObjectives).values({
        clinicId,
        priorities: objData.priorities as any,
        painPoints: objData.painPoints as any,
        additionalNotes: objData.additionalNotes ?? undefined,
      })
    }

    // Services
    const svcData = CLINIC_SERVICES_DATA[clinicKey]
    if (svcData) {
      await db.insert(clinicServices).values({
        clinicId,
        services: svcData as any,
      })
    }

    // Scheduling
    await db.insert(clinicScheduling).values({
      clinicId,
      weeklySchedule: buildWeeklySchedule() as any,
      defaultAppointmentDuration: 30,
      minimumAdvanceHours: 2,
      maxFutureDays: 90,
      specificBlocks: [] as any,
      timeBlocks: [] as any,
      minimumInterval: 15,
    })

    // Carol Settings
    const carolData = CAROL_SETTINGS_DATA[clinicKey]
    if (carolData) {
      await db.insert(clinicCarolSettings).values({
        clinicId,
        name: carolData.name,
        selectedTraits: carolData.selectedTraits as any,
        voiceTone: carolData.voiceTone,
        greeting: carolData.greeting,
        restrictSensitiveTopics: carolData.restrictSensitiveTopics,
        schedulingRules: carolData.schedulingRules as any,
        status: carolData.status,
        publishedAt: carolData.status === 'published' ? new Date('2026-01-15') : null,
      })
    }

    // Notifications
    const isSmileplus = clinicKey === 'smileplus'
    await db.insert(clinicNotifications).values({
      clinicId,
      notificationSettings: { newBooking: true, riskOfLoss: true } as any,
      alertChannels: isSmileplus ? ['whatsapp', 'email'] as any : ['whatsapp'] as any,
      phoneNumbers: isSmileplus
        ? ['+5531988887777', '+5531977776666'] as any
        : ['+55119999' + (clinicKey === 'bellavita_sp' ? '1111' : '2222')] as any,
    })
  }

  if (verbose) console.log(`  ✓ Clinic settings created for ${ACTIVE_CLINICS.length} clinics`)
}
