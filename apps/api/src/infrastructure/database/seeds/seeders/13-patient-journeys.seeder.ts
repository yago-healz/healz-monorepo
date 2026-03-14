import { db } from '../../index'
import { patientJourneyView } from '../../schema'
import type { SeedContext } from '../seed'
import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'

type Stage = 'lead' | 'engaged' | 'scheduled' | 'confirmed' | 'in_treatment' | 'completed' | 'dropped' | 'at_risk'

interface StageConfig {
  stage: Stage
  count: number
  riskScoreRange: [number, number]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

const STAGE_DISTRIBUTION: StageConfig[] = [
  { stage: 'lead',         count: 20, riskScoreRange: [0, 20],   riskLevel: 'low' },
  { stage: 'engaged',      count: 15, riskScoreRange: [0, 30],   riskLevel: 'low' },
  { stage: 'scheduled',    count: 15, riskScoreRange: [10, 40],  riskLevel: 'low' },
  { stage: 'confirmed',    count: 10, riskScoreRange: [0, 25],   riskLevel: 'low' },
  { stage: 'in_treatment', count: 15, riskScoreRange: [20, 60],  riskLevel: 'medium' },
  { stage: 'completed',    count: 10, riskScoreRange: [0, 20],   riskLevel: 'low' },
  { stage: 'dropped',      count: 5,  riskScoreRange: [50, 90],  riskLevel: 'high' },
  { stage: 'at_risk',      count: 10, riskScoreRange: [60, 100], riskLevel: 'high' },
]

function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

function buildMilestones(stage: Stage): Array<{ type: string; occurredAt: string }> {
  const milestones = []
  const order: Stage[] = ['lead', 'engaged', 'scheduled', 'confirmed', 'in_treatment', 'completed']
  const stageIndex = order.indexOf(stage)

  if (stageIndex >= 1) {
    milestones.push({ type: 'first_message', occurredAt: faker.date.past({ years: 1 }).toISOString() })
  }
  if (stageIndex >= 2) {
    milestones.push({ type: 'first_appointment', occurredAt: faker.date.past({ years: 1 }).toISOString() })
  }
  if (stageIndex >= 5) {
    milestones.push({ type: 'first_consultation_completed', occurredAt: faker.date.past({ years: 1 }).toISOString() })
  }

  return milestones
}

function buildStageHistory(currentStage: Stage): Array<{ stage: string; enteredAt: string }> {
  const order: Stage[] = ['lead', 'engaged', 'scheduled', 'confirmed', 'in_treatment', 'completed']
  const stageIndex = order.indexOf(currentStage)
  if (stageIndex === -1) {
    // dropped or at_risk - show partial history
    return [
      { stage: 'lead', enteredAt: faker.date.past({ years: 1 }).toISOString() },
      { stage: currentStage, enteredAt: faker.date.recent({ days: 30 }).toISOString() },
    ]
  }

  const history = []
  let date = faker.date.past({ years: 1 })
  for (let i = 0; i <= stageIndex; i++) {
    history.push({ stage: order[i], enteredAt: date.toISOString() })
    date = new Date(date.getTime() + faker.number.int({ min: 1, max: 30 }) * 24 * 60 * 60 * 1000)
  }
  return history
}

export async function seedPatientJourneys(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding patient_journeys...')

  const now = new Date()
  let patientIndex = 0
  let total = 0

  for (const config of STAGE_DISTRIBUTION) {
    for (let i = 0; i < config.count && patientIndex < ctx.patientIds.length; i++) {
      const patientId = ctx.patientIds[patientIndex++]
      const { clinicId, tenantId } = ctx.patientClinics[patientId]

      const riskScore = faker.number.int({
        min: config.riskScoreRange[0],
        max: config.riskScoreRange[1],
      })
      const riskLevel = getRiskLevel(riskScore)
      const milestones = buildMilestones(config.stage)
      const stageHistory = buildStageHistory(config.stage)
      const createdAt = faker.date.past({ years: 1 })

      await db.insert(patientJourneyView).values({
        id: randomUUID(),
        patientId,
        tenantId,
        clinicId,
        currentStage: config.stage,
        riskScore,
        riskLevel,
        milestones: milestones as any,
        stageHistory: stageHistory as any,
        createdAt,
        updatedAt: now,
      })

      total++
    }
  }

  if (verbose) console.log(`  ✓ ${total} patient journeys created`)
}
