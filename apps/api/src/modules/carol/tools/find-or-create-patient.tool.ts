import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../infrastructure/database'
import { patientContacts } from '../../../infrastructure/database/schema'

type PatientContact = typeof patientContacts.$inferSelect

function normalizePhone(phone: string): string {
  // Remove tudo exceto dígitos e o sinal +
  const clean = phone.replace(/[^\d+]/g, '')
  // Se não começar com +, assume Brasil
  if (!clean.startsWith('+')) {
    const digits = clean.replace(/\D/g, '')
    if (digits.length === 11) return `+55${digits}`
    if (digits.length === 10) return `+55${digits}`
    return `+55${digits}`
  }
  return clean
}

function calcMissingFields(contact: PatientContact): string[] {
  const missing: string[] = []
  if (!contact.name) missing.push('name')
  if (!contact.phone) missing.push('phone')
  if (!contact.cpf) missing.push('cpf')
  if (!contact.email) missing.push('email')
  return missing
}

export class FindOrCreatePatientTool extends StructuredTool {
  name = 'find_or_create_patient'
  description =
    'Busca um paciente pelo telefone ou CPF na clínica. Se não existir, cria um novo registro. Use antes de agendar para obter o ID do paciente.'

  schema = z.object({
    phone: z.string().optional().describe('Telefone do paciente com DDD (ex: 11999887766 ou +5511999887766)'),
    name: z.string().optional().describe('Nome completo do paciente'),
    cpf: z.string().optional().describe('CPF do paciente (ex: 123.456.789-00)'),
    email: z.string().optional().describe('Email do paciente'),
  })

  private readonly logger = new Logger(FindOrCreatePatientTool.name)

  constructor(private readonly clinicId: string) {
    super()
  }

  async _call(input: { phone?: string; name?: string; cpf?: string; email?: string }): Promise<string> {
    const normalizedPhone = input.phone ? normalizePhone(input.phone) : undefined

    this.logger.log(`[FindOrCreatePatient] Looking up patient for clinic ${this.clinicId}`, {
      phone: normalizedPhone,
      hasCpf: !!input.cpf,
      hasName: !!input.name,
    })

    // 1. Tentar encontrar por phone (prioridade) ou cpf
    let existing: PatientContact | undefined

    if (normalizedPhone) {
      const rows = await db
        .select()
        .from(patientContacts)
        .where(and(eq(patientContacts.clinicId, this.clinicId), eq(patientContacts.phone, normalizedPhone)))
        .limit(1)
      existing = rows[0]
    }

    if (!existing && input.cpf) {
      const rows = await db
        .select()
        .from(patientContacts)
        .where(and(eq(patientContacts.clinicId, this.clinicId), eq(patientContacts.cpf, input.cpf)))
        .limit(1)
      existing = rows[0]
    }

    // 2. Se encontrou, atualizar campos faltantes com dados fornecidos agora
    if (existing) {
      const updates: Partial<typeof patientContacts.$inferInsert> = {}
      if (input.name && !existing.name) updates.name = input.name
      if (normalizedPhone && !existing.phone) updates.phone = normalizedPhone
      if (input.cpf && !existing.cpf) updates.cpf = input.cpf
      if (input.email && !existing.email) updates.email = input.email

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date()
        const updated = await db
          .update(patientContacts)
          .set(updates)
          .where(eq(patientContacts.id, existing.id))
          .returning()
        existing = updated[0]
        this.logger.log(`[FindOrCreatePatient] Updated existing contact ${existing.id}`, { updates })
      }

      const result = {
        contactId: existing.id,
        patientId: existing.patientId ?? null,
        name: existing.name ?? null,
        phone: existing.phone ?? null,
        cpf: existing.cpf ?? null,
        email: existing.email ?? null,
        isNew: false,
        missingFields: calcMissingFields(existing),
      }
      this.logger.log(`[FindOrCreatePatient] Returning existing contact`, { contactId: result.contactId, isNew: false })
      return JSON.stringify(result)
    }

    // 3. Criar novo registro
    const inserted = await db
      .insert(patientContacts)
      .values({
        clinicId: this.clinicId,
        phone: normalizedPhone ?? null,
        name: input.name ?? null,
        cpf: input.cpf ?? null,
        email: input.email ?? null,
        source: 'carol',
      })
      .returning()

    const newContact = inserted[0]
    this.logger.log(`[FindOrCreatePatient] Created new contact ${newContact.id}`)

    const result = {
      contactId: newContact.id,
      patientId: newContact.patientId ?? null,
      name: newContact.name ?? null,
      phone: newContact.phone ?? null,
      cpf: newContact.cpf ?? null,
      email: newContact.email ?? null,
      isNew: true,
      missingFields: calcMissingFields(newContact),
    }
    return JSON.stringify(result)
  }
}
