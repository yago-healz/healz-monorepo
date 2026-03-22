# Fase 3: GetDoctorAvailabilityTool — Disponibilidade por Médico

## Objetivo

Substituir `CheckAvailabilityTool` (agenda da clínica) e `GetOperatingHoursTool` por uma única tool que consulta a disponibilidade de um **médico específico**, considerando:
- Agenda semanal do médico (`doctor_clinic_schedules.weeklySchedule`)
- Bloqueios específicos (`doctor_clinic_schedules.specificBlocks`)
- Google Calendar do médico (`DoctorGoogleCalendarService.getFreeBusy()`)
- Agendamentos existentes no sistema (`appointment_view`)
- Regras de antecedência e limite futuro

## Design da Tool

### Nome: `get_doctor_availability`

### Descrição para o LLM:
```
Verifica os horários disponíveis de um médico específico em uma data.
Retorna os slots livres considerando a agenda do médico, compromissos no Google Calendar
e agendamentos já existentes. Use após identificar o médico desejado com list_doctors.
```

### Schema de Input:
```typescript
z.object({
  doctorId: z.string().describe('ID do médico (obtido via list_doctors)'),
  date: z.string().describe('Data no formato YYYY-MM-DD'),
})
```

### Schema de Output:
```typescript
{
  doctorId: string
  doctorName: string
  date: string
  dayOfWeek: string           // "segunda-feira", "terça-feira", etc.
  slots: Array<{
    time: string              // "09:00", "09:30", etc.
    available: true
  }>
  appointmentDuration: number // duração padrão em minutos
  message?: string            // "Médico não atende neste dia", "Data muito distante", etc.
}
```

## Implementação

Arquivo: `apps/api/src/modules/carol/tools/get-doctor-availability.tool.ts`

### Dependências Injetadas:
```typescript
constructor(
  private readonly clinicId: string,
  private readonly doctorService: DoctorService,
  private readonly doctorGoogleCalendarService: DoctorGoogleCalendarService,
) { super() }
```

### Algoritmo:

```
1. VALIDAR MÉDICO
   - Buscar doctor_profiles pelo doctorId
   - Verificar que está ativo e vinculado à clínica
   - Obter userId do médico (necessário para Google Calendar)

2. BUSCAR AGENDA DO MÉDICO
   - Query: doctor_clinic_schedules WHERE doctorClinicId = (doctor_clinics.id para este médico+clínica)
   - Se não tem agenda configurada → retornar mensagem "Médico sem agenda configurada"

3. VALIDAR DATA
   - Verificar maxFutureDays (não aceitar datas muito distantes)
   - Data no passado → retornar slots vazio

4. VERIFICAR DIA DA SEMANA
   - Extrair dia da semana da data
   - Buscar no weeklySchedule: { day, isOpen, timeSlots }
   - Se !isOpen ou sem timeSlots → retornar "Médico não atende neste dia"

5. GERAR SLOTS CANDIDATOS
   - Para cada timeSlot (ex: {from: "08:00", to: "12:00"}):
     Gerar slots a cada `defaultAppointmentDuration` minutos
   - Ex: duration=30 → ["08:00", "08:30", "09:00", ...]

6. FILTRAR SLOTS PASSADOS
   - Remover slots no passado (considerando timezone)
   - Aplicar minimumAdvanceHours

7. FILTRAR POR SPECIFIC BLOCKS
   - Buscar bloqueios na data: specificBlocks.filter(b => b.date === input.date)
   - Remover slots que colidem com bloqueios

8. FILTRAR POR GOOGLE CALENDAR
   - Verificar se médico tem Google Calendar conectado:
     doctorGoogleCalendarService.isConnected(doctorId=userId, clinicId)
   - Se conectado: buscar busySlots via getFreeBusy(userId, clinicId, date, timezone)
   - Remover slots que colidem com busy times

9. FILTRAR POR AGENDAMENTOS EXISTENTES
   - Query appointment_view:
     WHERE doctorId = userId
       AND scheduledAt BETWEEN startOfDay AND endOfDay
       AND status IN ('scheduled', 'confirmed')
   - Para cada agendamento, calcular período ocupado (scheduledAt → scheduledAt + duration)
   - Remover slots que colidem

10. RETORNAR slots disponíveis restantes
```

### Diferenças em relação ao CheckAvailabilityTool atual:

| Aspecto | CheckAvailabilityTool (atual) | GetDoctorAvailabilityTool (novo) |
|---------|-------------------------------|----------------------------------|
| Agenda | `clinic_scheduling` | `doctor_clinic_schedules` |
| Google Calendar | `GoogleCalendarService` (clínica) | `DoctorGoogleCalendarService` (médico) |
| Agendamentos | Não verifica | Verifica `appointment_view` |
| Input | Apenas date | doctorId + date |
| Contexto | Clínica inteira | Médico específico |

### Reutilização de Código:

As funções utilitárias do `CheckAvailabilityTool` atual podem ser extraídas para um arquivo compartilhado:

```
apps/api/src/modules/carol/tools/utils/
  ├── time-slots.ts     → generateSlots(), toUtcMs(), getTimezoneOffset()
  └── collision.ts      → collidesWithBusy(), collidesWithBlock()
```

Essas funções são idênticas em lógica — a diferença está apenas na fonte dos dados.

## Consulta de Agendamentos Existentes

Query para buscar agendamentos do médico no dia:

```typescript
const dayStart = new Date(`${input.date}T00:00:00`)
const dayEnd = new Date(`${input.date}T23:59:59`)

// Ajustar para UTC considerando timezone da clínica
const appointments = await db
  .select({
    scheduledAt: appointmentView.scheduledAt,
    duration: appointmentView.duration,
  })
  .from(appointmentView)
  .where(and(
    eq(appointmentView.doctorId, userId),
    gte(appointmentView.scheduledAt, dayStartUtc),
    lte(appointmentView.scheduledAt, dayEndUtc),
    inArray(appointmentView.status, ['scheduled', 'confirmed']),
  ))
```

### Colisão com Agendamento:

```typescript
function collidesWithAppointment(
  slotTime: string,
  dateStr: string,
  appointments: Array<{ scheduledAt: Date; duration: number }>,
  slotDuration: number,
  timezone: string,
): boolean {
  const slotStartMs = toUtcMs(dateStr, slotTime, timezone)
  const slotEndMs = slotStartMs + slotDuration * 60 * 1000

  return appointments.some(apt => {
    const aptStartMs = apt.scheduledAt.getTime()
    const aptEndMs = aptStartMs + apt.duration * 60 * 1000
    return slotStartMs < aptEndMs && slotEndMs > aptStartMs
  })
}
```

## Mapeamento doctorId → userId

Importante: nas tools, `doctorId` se refere a `doctor_profiles.id`, mas nas tabelas de agendamento e Google Calendar, o identificador é `users.id` (= `doctor_profiles.userId`).

A tool precisa resolver essa conversão:

```typescript
// Buscar userId a partir do doctorProfileId
const [profile] = await db
  .select({ userId: doctorProfiles.userId })
  .from(doctorProfiles)
  .where(eq(doctorProfiles.id, input.doctorId))
```

## Exemplos de Uso pelo LLM

### Fluxo típico:
```
Paciente: "Quero marcar com o Dr. Ricardo na quinta"
Carol: list_doctors({ name: "Ricardo" })
  → { doctors: [{ doctorId: "abc", name: "Dr. Ricardo Silva", ... }] }
Carol: get_doctor_availability({ doctorId: "abc", date: "2026-03-26" })
  → { slots: [{ time: "09:00" }, { time: "09:30" }, { time: "10:30" }, ...] }
Carol: "Dr. Ricardo tem horários disponíveis na quinta-feira, dia 26/03:
        09:00, 09:30, 10:30, 11:00, 14:00, 14:30, 15:00.
        Qual horário prefere?"
```

## Testes

1. **Médico com agenda configurada** → retorna slots corretos
2. **Médico sem agenda** → retorna mensagem adequada
3. **Dia que médico não atende** → slots vazio com mensagem
4. **Filtro de slots passados** → não mostra horários já passados
5. **minimumAdvanceHours** → respeita antecedência mínima
6. **maxFutureDays** → rejeita datas muito distantes
7. **Specific blocks** → remove slots bloqueados
8. **Google Calendar busy** → remove slots ocupados no gcal
9. **Agendamentos existentes** → remove slots com consultas marcadas
10. **Sobreposição tripla** → slot bloqueado por gcal E appointment → removido corretamente
11. **Médico inativo** → erro ou lista vazia
12. **doctorId inválido** → mensagem de erro clara
