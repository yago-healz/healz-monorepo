# Fase 4: CreateAppointmentTool Real — Agendamento via Event Sourcing

## Objetivo

Reescrever o `CreateAppointmentTool` (atualmente mockado) para criar agendamentos reais usando o `AppointmentService.schedule()`, que já implementa:
- Criação via Event Sourcing (Appointment aggregate)
- Detecção de conflitos de horário por médico
- Projeção automática para `appointment_view`
- Publicação de eventos via RabbitMQ

## Design da Tool

### Nome: `create_appointment`

### Descrição para o LLM:
```
Cria um agendamento real para o paciente com um médico específico.
IMPORTANTE: Antes de usar esta tool, você DEVE:
1. Ter o doctorId (via list_doctors)
2. Ter verificado disponibilidade (via get_doctor_availability)
3. Ter os dados do paciente (via find_or_create_patient)
4. Ter confirmado todos os dados com o paciente
```

### Schema de Input:
```typescript
z.object({
  doctorId: z.string().describe('ID do médico (obtido via list_doctors)'),
  contactId: z.string().describe('ID do contato do paciente (obtido via find_or_create_patient)'),
  date: z.string().describe('Data no formato YYYY-MM-DD'),
  time: z.string().describe('Horário no formato HH:MM'),
  procedure: z.string().optional().describe('Nome do procedimento/serviço'),
  notes: z.string().optional().describe('Observações adicionais do paciente'),
})
```

### Schema de Output:
```typescript
{
  success: boolean
  appointmentId?: string
  doctor: string           // Nome do médico
  date: string             // Data formatada "26/03/2026"
  time: string             // "09:30"
  duration: number         // minutos
  procedure?: string
  error?: string           // Se success=false
}
```

## Implementação

Arquivo: `apps/api/src/modules/carol/tools/create-appointment.tool.ts` (reescrita completa)

### Dependências:
```typescript
constructor(
  private readonly clinicId: string,
  private readonly appointmentService: AppointmentService,
  private readonly doctorService: DoctorService,
) { super() }
```

### Algoritmo:

```
1. RESOLVER MÉDICO
   - Buscar doctor_profiles pelo doctorId → obter userId, name
   - Buscar doctor_clinics para obter doctorClinicId
   - Se médico não encontrado ou inativo → erro

2. RESOLVER PACIENTE
   - Buscar patient_contacts pelo contactId → obter patientId
   - Se patientId é null (paciente sem cadastro formal):
     → Criar registro mínimo na tabela de pacientes OU
     → Usar o contactId como referência temporária
   - DECISÃO: Para MVP, o contactId da patient_contacts serve como
     identificador. O patientId real pode ser vinculado depois.

3. RESOLVER TENANT
   - Buscar clinic → obter organizationId (= tenantId)

4. CALCULAR scheduledAt
   - Combinar date + time → converter para UTC considerando timezone da clínica
   - Usar mesma lógica de toUtcMs() da Fase 3

5. DETERMINAR DURAÇÃO
   - Se procedure fornecido:
     → Buscar em doctor_clinic_procedures pelo nome → usar durationOverride ou defaultDuration
   - Senão:
     → Usar doctor_clinics.defaultDuration (padrão 30 min)

6. CHAMAR AppointmentService.schedule()
   - Parâmetros:
     {
       patientId: contactId (ou patientId se existir),
       tenantId: organizationId,
       clinicId: this.clinicId,
       doctorId: userId (do médico),
       scheduledAt: Date (UTC),
       duration: number,
       reason: procedure || 'Consulta agendada via Carol',
       notes: input.notes,
     }
   - O service já verifica conflitos internamente
   - Em caso de conflito → throw Error("Time slot not available")

7. RETORNAR resultado
   - success: true, appointmentId, dados formatados
   - Ou success: false com mensagem de erro amigável
```

### Tratamento de Erros:

```typescript
try {
  const appointmentId = await this.appointmentService.schedule({...})
  return JSON.stringify({
    success: true,
    appointmentId,
    doctor: doctorName,
    date: formatDate(input.date),
    time: input.time,
    duration,
    procedure: input.procedure,
  })
} catch (error) {
  if (error.message === 'Time slot not available') {
    return JSON.stringify({
      success: false,
      error: 'Este horário não está mais disponível. Por favor, escolha outro horário.',
    })
  }
  return JSON.stringify({
    success: false,
    error: 'Não foi possível criar o agendamento. Tente novamente ou entre em contato com a clínica.',
  })
}
```

## Questão: patientId vs contactId

O `AppointmentService.schedule()` exige `patientId`. Temos duas opções:

### Opção A: Usar contactId como patientId (pragmática)
- O campo `patientId` no appointment armazena o `contactId` da `patient_contacts`
- Simples, funciona imediatamente
- Desvantagem: mistura conceitos (contato ≠ paciente)

### Opção B: Auto-criar Patient a partir do Contact (recomendada)
- Quando Carol cria um agendamento, se `patient_contacts.patientId` é null:
  1. Criar um registro mínimo na entidade Patient (nome + phone)
  2. Vincular: `patient_contacts.patientId = newPatientId`
  3. Usar o `patientId` real no appointment
- Vantagem: modelo de domínio limpo, Patient é a entidade canônica
- Desvantagem: precisa verificar como a entidade Patient é criada (pode já ter aggregate)

**Recomendação**: Opção B. Verificar na implementação se existe Patient aggregate ou se é CRUD simples.

## Integração com AppointmentService

O `AppointmentService` já está pronto e funcional:

```typescript
// appointment.service.ts - método schedule()
async schedule(params: {
  patientId: string
  tenantId: string
  clinicId: string
  doctorId: string      // Este é o users.id do médico
  scheduledAt: Date
  duration: number
  reason?: string
  notes?: string
}): Promise<string>     // Retorna appointmentId
```

O service já:
- Cria via Event Sourcing (Appointment aggregate)
- Detecta conflitos de horário (`checkTimeConflicts`)
- Projeta para `appointment_view` via `AppointmentProjectionHandler`
- Publica eventos via `IEventBus` (RabbitMQ)

## Module Dependencies

O `CarolModule` precisará importar o `AppointmentModule`:

```typescript
// carol.module.ts
@Module({
  imports: [
    ClinicSettingsModule,
    GoogleCalendarModule,
    AppointmentModule,    // NOVO - para AppointmentService
    DoctorModule,         // NOVO - para DoctorService (se não já importado)
  ],
  ...
})
```

Verificar se `AppointmentService` é exportado pelo `AppointmentModule`.

## Fluxo Completo de Agendamento (todas as tools)

```
Paciente: "Quero agendar uma consulta com o Dr. Ricardo para amanhã"

1. Carol → list_doctors({ name: "Ricardo" })
   ← { doctors: [{ doctorId: "prof-123", name: "Dr. Ricardo Silva", specialty: "Oftalmologia" }] }

2. Carol → get_doctor_availability({ doctorId: "prof-123", date: "2026-03-23" })
   ← { slots: [{ time: "09:00" }, { time: "10:00" }, { time: "14:00" }], duration: 30 }

3. Carol: "Dr. Ricardo tem horários disponíveis amanhã: 09:00, 10:00, 14:00. Qual prefere?"
   Paciente: "14:00"

4. Carol: "Perfeito! Para confirmar, preciso do seu nome completo e telefone."
   Paciente: "Maria Silva, 11 99988-7766"

5. Carol → find_or_create_patient({ name: "Maria Silva", phone: "+5511999887766" })
   ← { contactId: "contact-456", isNew: true, missingFields: ["cpf"] }

6. Carol: "Confirmando: Consulta com Dr. Ricardo Silva (Oftalmologia)
           Data: 23/03/2026 às 14:00 (30 min)
           Paciente: Maria Silva
           Confirma?"
   Paciente: "Sim"

7. Carol → create_appointment({
     doctorId: "prof-123",
     contactId: "contact-456",
     date: "2026-03-23",
     time: "14:00",
     procedure: "Consulta oftalmológica"
   })
   ← { success: true, appointmentId: "apt-789", ... }

8. Carol: "Agendamento confirmado! Consulta com Dr. Ricardo Silva dia 23/03 às 14:00.
           Lembre-se de chegar 10 minutos antes."
```

## Testes

1. **Agendamento bem-sucedido** → cria via AppointmentService, retorna appointmentId
2. **Conflito de horário** → retorna success: false com mensagem amigável
3. **Médico inválido/inativo** → erro claro
4. **Contato inválido** → erro claro
5. **Duração por procedimento** → busca durationOverride do procedimento vinculado ao médico
6. **Duração padrão** → usa defaultDuration do doctor_clinics quando sem procedimento
7. **Conversão timezone** → scheduledAt em UTC correto para timezone da clínica
8. **Evento publicado** → AppointmentScheduledEvent emitido (via service existente)
9. **Projeção atualizada** → appointment_view atualizado (via handler existente)
