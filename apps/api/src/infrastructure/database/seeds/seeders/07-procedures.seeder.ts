import { db } from '../../index'
import { procedures, doctorClinicProcedures } from '../../schema'
import type { SeedContext } from '../seed'
import { PROCEDURES_BY_CLINIC } from '../data/procedures.data'

// Which doctor-clinic keys serve which clinic procedures
const DOCTOR_CLINIC_PROCEDURE_MAP: Record<string, string[]> = {
  bellavita_sp: ['carlos_sp', 'rafael_sp', 'marcos_sp'],
  bellavita_rj: ['carlos_rj', 'rafael_rj', 'marcos_rj'],
  smileplus: ['lucia_smile', 'ana_smile'],
}

// Price ranges by category
function getPrice(category: string): string {
  const ranges: Record<string, [number, number]> = {
    'Estética Facial': [800, 2500],
    'Tratamento de Pele': [350, 900],
    'Laser': [600, 1800],
    'Consulta': [250, 450],
    'Prevenção': [150, 350],
    'Restauradora': [200, 600],
    'Endodontia': [800, 1800],
    'Estética': [1200, 3500],
    'Ortodontia': [300, 600],
    'Cirurgia': [400, 1500],
    'Implantodontia': [2500, 4500],
  }
  const [min, max] = ranges[category] ?? [200, 800]
  const price = Math.floor(Math.random() * (max - min + 1) + min)
  return price.toFixed(2)
}

export async function seedProcedures(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding procedures and doctor_clinic_procedures...')

  let totalProcedures = 0
  let totalDcp = 0

  for (const [clinicKey, procedureList] of Object.entries(PROCEDURES_BY_CLINIC)) {
    const clinicId = ctx.clinicIds[clinicKey]
    if (!clinicId) continue

    const procedureIds: string[] = []

    for (const proc of procedureList) {
      const [result] = await db.insert(procedures).values({
        clinicId,
        name: proc.name,
        description: proc.description,
        category: proc.category,
        defaultDuration: proc.defaultDuration,
        isActive: true,
      }).returning()

      procedureIds.push(result.id)
      totalProcedures++
    }

    ctx.procedureIdsByClinic[clinicKey] = procedureIds

    // Link procedures to doctor_clinics
    const doctorClinicKeys = DOCTOR_CLINIC_PROCEDURE_MAP[clinicKey] ?? []

    for (const dcKey of doctorClinicKeys) {
      const dcId = ctx.doctorClinicIds[dcKey]
      if (!dcId) continue

      for (let i = 0; i < procedureIds.length; i++) {
        const procId = procedureIds[i]
        const isActive = i < procedureIds.length - 1 // last procedure is inactive
        const hasDurationOverride = i % 3 === 0 // every 3rd has duration override

        await db.insert(doctorClinicProcedures).values({
          doctorClinicId: dcId,
          procedureId: procId,
          price: getPrice(PROCEDURES_BY_CLINIC[clinicKey][i].category),
          durationOverride: hasDurationOverride
            ? PROCEDURES_BY_CLINIC[clinicKey][i].defaultDuration + 15
            : null,
          isActive,
        })
        totalDcp++
      }
    }
  }

  if (verbose) console.log(`  ✓ ${totalProcedures} procedures and ${totalDcp} doctor_clinic_procedures created`)
}
