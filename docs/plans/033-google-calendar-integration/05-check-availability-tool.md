# Tarefa 05 — CheckAvailabilityTool: Implementação Real

**Objetivo:** Substituir o mock da ferramenta `CheckAvailabilityTool` da Carol por uma implementação real que combina a agenda configurada pela clínica com os períodos ocupados no Google Calendar.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/modules/carol/tools/check-availability.tool.ts` | Modificar — substituir mock |
| `apps/api/src/modules/carol/carol.module.ts` | Modificar — injetar dependências novas |
| `apps/api/src/modules/carol/chat/carol-chat.service.ts` | Modificar — passar dependências para a tool |

---

## Lógica de Disponibilidade

```
1. Buscar weeklySchedule da clínica via ClinicSettingsService
2. Identificar o dia da semana para a data solicitada
3. Se o dia não está configurado como aberto → retornar [] (sem slots)
4. Gerar todos os slots candidatos do dia (baseado nos timeSlots do dia + defaultAppointmentDuration)
5. Buscar appointments já confirmados/agendados para a data no banco (via AppointmentService ou repositório)
6. Se Google Calendar conectado:
     a. Chamar GoogleCalendarService.getFreeBusy(clinicId, date)
     b. Converter os períodos ocupados para o timezone da clínica
7. Remover dos slots candidatos aqueles que colidem com:
     a. Appointments do nosso DB
     b. Slots ocupados do Google Calendar
8. Retornar os slots livres restantes
```

---

## Implementação

### Tool atualizada (`check-availability.tool.ts`)

```typescript
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ClinicSettingsService } from '../../clinic-settings/clinic-settings.service'
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service'

export class CheckAvailabilityTool extends StructuredTool {
  name = 'check_availability'
  description = 'Verifica horários disponíveis para agendamento em uma data específica'
  schema = z.object({
    date: z.string().describe('Data no formato YYYY-MM-DD'),
  })

  constructor(
    private readonly clinicId: string,
    private readonly clinicSettingsService: ClinicSettingsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {
    super()
  }

  async _call(input: { date: string }): Promise<string> {
    const scheduling = await this.clinicSettingsService.getScheduling(this.clinicId)
    const dayOfWeek = getDayOfWeek(input.date)  // 'monday' | 'tuesday' | ...
    const daySchedule = scheduling.weeklySchedule.find(d => d.day === dayOfWeek)

    if (!daySchedule?.isOpen || !daySchedule.timeSlots.length) {
      return JSON.stringify({ date: input.date, slots: [] })
    }

    // Gerar slots candidatos
    const duration = scheduling.defaultAppointmentDuration
    const candidates = generateSlots(daySchedule.timeSlots, duration)

    // Busy slots do Google Calendar
    let busySlots: Array<{ start: string; end: string }> = []
    if (await this.googleCalendarService.isConnected(this.clinicId)) {
      busySlots = await this.googleCalendarService.getFreeBusy(this.clinicId, new Date(input.date))
    }

    // Filtrar candidatos que colidem com períodos ocupados
    const available = candidates.filter(slot => !collidesWithBusy(slot, busySlots, duration))

    return JSON.stringify({
      date: input.date,
      slots: available.map(time => ({ time, available: true })),
    })
  }
}

// Helpers (no mesmo arquivo ou em utils separado)
function getDayOfWeek(dateStr: string): string { /* ... */ }
function generateSlots(timeSlots: TimeSlot[], duration: number): string[] { /* ... */ }
function collidesWithBusy(slotTime: string, busySlots: ..., duration: number): boolean { /* ... */ }
```

### Atualização de `carol-chat.service.ts`

A tool é instanciada em `carol-chat.service.ts`. Adicionar as novas dependências:

```typescript
// Antes:
new CheckAvailabilityTool(clinicId)

// Depois:
new CheckAvailabilityTool(clinicId, this.clinicSettingsService, this.googleCalendarService)
```

Injetar `ClinicSettingsService` e `GoogleCalendarService` no `CarolChatService` via construtor.

### Atualização de `carol.module.ts`

Importar `GoogleCalendarModule` e `ClinicSettingsModule` (ou o que for necessário para os providers ficarem disponíveis):

```typescript
@Module({
  imports: [
    GoogleCalendarModule,
    ClinicSettingsModule,  // se já não está importado
  ],
  // ...
})
export class CarolModule {}
```

---

## Considerações

- **Timezone:** Os slots gerados estão em horário local da clínica. O Free/Busy da Google retorna em UTC. Converter corretamente antes de comparar. Usar a timezone configurada na clínica ou assumir o timezone do servidor como default para o MVP.
- **Graceful degradation:** Se `getFreeBusy()` lançar exceção (ex: token expirado, quota excedida), logar o erro e continuar retornando os slots baseados apenas no nosso DB — não falhar a ferramenta da Carol.

---

## Critério de aceite

- `CheckAvailabilityTool._call({ date: '2026-03-15' })` retorna slots reais baseados no `weeklySchedule` da clínica
- Para clínicas sem Google Calendar conectado: retorna slots baseados apenas na agenda configurada
- Para clínicas com Google Calendar conectado: slots ocupados na agenda Google estão ausentes do retorno
- Se a clínica não configurou a agenda para o dia solicitado (isOpen = false), retorna `{ slots: [] }`
- A mock note `'[Playground] Dados simulados'` não aparece mais no retorno
