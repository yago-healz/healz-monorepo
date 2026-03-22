# Fase 5: Evolução GetServicesTool + GetPatientAppointmentsTool

## Parte A: Evolução do GetServicesTool

### Problema Atual

O `GetServicesTool` lista **todos** os procedimentos da clínica com preço agregado (min/max de todos os médicos). Não permite filtrar por médico, o que é essencial quando Carol já identificou um profissional específico.

### Mudança

Adicionar parâmetro opcional `doctorId` para filtrar procedimentos de um médico específico.

### Schema Atualizado:

```typescript
z.object({
  doctorId: z.string().optional()
    .describe('ID do médico para filtrar seus procedimentos específicos. Se omitido, lista todos da clínica.'),
})
```

### Comportamento:

```
Se doctorId fornecido:
  → Buscar doctor_clinic_procedures para este médico nesta clínica
  → Retornar com preço específico do médico e duração
  → Incluir nome do médico na resposta

Se doctorId não fornecido (comportamento atual):
  → Listar todos os procedimentos da clínica
  → Agregar preços min/max de todos os médicos
```

### Output com doctorId:

```typescript
{
  doctor?: string    // "Dr. Ricardo Silva" (quando filtrado)
  services: Array<{
    name: string
    description: string | null
    category: string | null
    duration: string           // "30 minutos" (effectiveDuration do médico)
    price?: string             // "R$ 150.00" (preço do médico, não agregado)
  }>
}
```

### Impacto no código existente:
- Apenas adição do filtro opcional — comportamento sem `doctorId` permanece idêntico
- Query adicional com JOIN em `doctor_clinics` + `doctor_clinic_procedures` quando `doctorId` presente

---

## Parte B: GetPatientAppointmentsTool

### Objetivo

Permitir que Carol informe ao paciente sobre seus próximos agendamentos. Útil para:
- "Tenho alguma consulta marcada?"
- "Quando é minha próxima consulta?"
- Carol lembrar proativamente: "Vi que você tem uma consulta amanhã com o Dr. Ricardo"

### Nome: `get_patient_appointments`

### Descrição para o LLM:
```
Busca os próximos agendamentos de um paciente nesta clínica.
Use quando o paciente perguntar sobre consultas marcadas ou quando precisar
verificar agendamentos existentes antes de criar um novo.
```

### Schema de Input:
```typescript
z.object({
  contactId: z.string().describe('ID do contato do paciente (obtido via find_or_create_patient)'),
  status: z.enum(['upcoming', 'all']).optional().default('upcoming')
    .describe('upcoming: apenas futuros agendados/confirmados. all: inclui passados e cancelados'),
})
```

### Schema de Output:
```typescript
{
  appointments: Array<{
    appointmentId: string
    doctorName: string
    specialty: string | null
    date: string           // "26/03/2026"
    time: string           // "14:00"
    duration: number       // minutos
    status: string         // "scheduled", "confirmed", "cancelled", etc.
    reason: string | null  // procedimento/motivo
  }>
  total: number
}
```

### Implementação:

```typescript
async _call(input: { contactId: string; status?: string }): Promise<string> {
  // 1. Buscar patientId a partir do contactId na patient_contacts
  const [contact] = await db
    .select({ patientId: patientContacts.patientId })
    .from(patientContacts)
    .where(and(
      eq(patientContacts.id, input.contactId),
      eq(patientContacts.clinicId, this.clinicId),
    ))

  if (!contact?.patientId) {
    return JSON.stringify({ appointments: [], total: 0 })
  }

  // 2. Buscar agendamentos do paciente nesta clínica
  const conditions = [
    eq(appointmentView.patientId, contact.patientId),
    eq(appointmentView.clinicId, this.clinicId),
  ]

  if (input.status === 'upcoming' || !input.status) {
    conditions.push(
      gte(appointmentView.scheduledAt, new Date()),
      inArray(appointmentView.status, ['scheduled', 'confirmed']),
    )
  }

  const rows = await db
    .select({
      id: appointmentView.id,
      scheduledAt: appointmentView.scheduledAt,
      duration: appointmentView.duration,
      status: appointmentView.status,
      reason: appointmentView.reason,
      doctorId: appointmentView.doctorId,
    })
    .from(appointmentView)
    .where(and(...conditions))
    .orderBy(appointmentView.scheduledAt)
    .limit(10)

  // 3. Enriquecer com dados do médico
  // Para cada appointment, buscar nome e especialidade do médico
  // via doctor_profiles + users JOIN

  // 4. Formatar datas para timezone da clínica

  return JSON.stringify({ appointments: formatted, total: formatted.length })
}
```

### Arquivo:
`apps/api/src/modules/carol/tools/get-patient-appointments.tool.ts`

### Uso pelo LLM:

```
Paciente: "Tenho alguma consulta marcada?"

Carol → find_or_create_patient({ phone: "+5511999887766" })
  ← { contactId: "contact-456", patientId: "pat-789" }

Carol → get_patient_appointments({ contactId: "contact-456" })
  ← { appointments: [
       { doctorName: "Dr. Ricardo", date: "26/03/2026", time: "14:00", status: "confirmed", ... }
     ]}

Carol: "Sim! Você tem uma consulta confirmada com o Dr. Ricardo Silva no dia 26/03 às 14:00."
```

## Testes

### GetServicesTool (evolução):
1. **Sem doctorId** → comportamento idêntico ao atual (agregado)
2. **Com doctorId válido** → retorna apenas procedimentos deste médico com preço específico
3. **Com doctorId inválido** → retorna lista vazia
4. **Médico sem procedimentos** → retorna lista vazia

### GetPatientAppointmentsTool:
1. **Paciente com agendamentos futuros** → lista ordenada por data
2. **Paciente sem agendamentos** → lista vazia
3. **Filtro upcoming** → apenas futuros com status scheduled/confirmed
4. **Filtro all** → inclui passados e cancelados
5. **contactId sem patientId** → lista vazia (paciente sem vínculo formal)
6. **Limite de 10** → não retorna mais que 10 registros
7. **Isolamento por clínica** → só retorna agendamentos desta clínica
