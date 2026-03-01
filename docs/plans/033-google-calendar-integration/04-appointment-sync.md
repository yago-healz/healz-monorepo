# Tarefa 04 — Sync Appointments → Google Calendar (Event Handler)

**Objetivo:** Reagir a eventos de domain do sistema de agendamentos e espelhar as alterações no Google Calendar da clínica, de forma assíncrona e desacoplada.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/modules/google-calendar/google-calendar-sync.handler.ts` | Criar |
| `apps/api/src/modules/google-calendar/google-calendar.module.ts` | Modificar — registrar handler |
| `apps/api/src/modules/appointment/domain/events/` | Ler (apenas referência) |

---

## Eventos a Processar

Verificar os event types existentes em `apps/api/src/modules/appointment/domain/events/`:

| Evento de Domain | Ação no Google Calendar |
|---|---|
| `AppointmentScheduled` | Criar evento |
| `AppointmentRescheduled` | Atualizar data/hora do evento |
| `AppointmentCancelled` | Deletar evento |
| `AppointmentConfirmed` | Atualizar título (adicionar "✓ Confirmado") |
| `AppointmentCompleted` | Atualizar título (adicionar "✅ Realizado") |
| `AppointmentNoShow` | Atualizar título (adicionar "⚠️ Não Compareceu") |

---

## Implementação

### Handler (`google-calendar-sync.handler.ts`)

```typescript
@Injectable()
export class GoogleCalendarSyncHandler {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    // Injetar repositório/serviço de appointment para buscar dados completos se necessário
  ) {}

  @OnEvent('appointment.scheduled')
  async onAppointmentScheduled(event: AppointmentScheduledEvent): Promise<void> {
    const { clinicId, appointmentId, scheduledAt, duration, patientName, reason } = event

    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    const startAt = new Date(scheduledAt)
    const endAt = new Date(startAt.getTime() + duration * 60 * 1000)

    await this.googleCalendarService.createEvent(clinicId, appointmentId, {
      summary: `Consulta — ${patientName}`,
      description: reason ?? undefined,
      startAt,
      endAt,
    })
  }

  @OnEvent('appointment.rescheduled')
  async onAppointmentRescheduled(event: AppointmentRescheduledEvent): Promise<void> {
    const { clinicId, appointmentId, newScheduledAt, duration } = event

    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    const startAt = new Date(newScheduledAt)
    const endAt = new Date(startAt.getTime() + duration * 60 * 1000)

    await this.googleCalendarService.updateEvent(clinicId, appointmentId, { startAt, endAt })
  }

  @OnEvent('appointment.cancelled')
  async onAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
    const { clinicId, appointmentId } = event

    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    await this.googleCalendarService.deleteEvent(clinicId, appointmentId)
  }

  @OnEvent('appointment.confirmed')
  async onAppointmentConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
    const { clinicId, appointmentId, patientName } = event

    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    await this.googleCalendarService.updateEvent(clinicId, appointmentId, {
      summary: `✓ Consulta — ${patientName}`,
    })
  }

  @OnEvent('appointment.completed')
  async onAppointmentCompleted(event: AppointmentCompletedEvent): Promise<void> {
    const { clinicId, appointmentId, patientName } = event

    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    await this.googleCalendarService.updateEvent(clinicId, appointmentId, {
      summary: `✅ Consulta — ${patientName}`,
    })
  }

  @OnEvent('appointment.no-show')
  async onAppointmentNoShow(event: AppointmentNoShowEvent): Promise<void> {
    const { clinicId, appointmentId, patientName } = event

    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    await this.googleCalendarService.updateEvent(clinicId, appointmentId, {
      summary: `⚠️ Falta — ${patientName}`,
    })
  }
}
```

> **Nota:** Os eventos de domain precisam incluir `patientName` (ou `patientId` para buscar o nome). Verificar a estrutura atual dos eventos em `apps/api/src/modules/appointment/domain/events/` e ajustar o handler conforme os campos disponíveis.

### Tratamento de erros

- Encapsular cada handler em `try/catch`
- Em caso de erro na API do Google, **logar o erro mas não relançar** — a falha de sync não deve afetar o fluxo principal do appointment
- Usar `Logger` do NestJS: `this.logger.error('Failed to sync appointment to Google Calendar', error)`

---

## Critério de aceite

- Quando um appointment é criado via `AppointmentService.schedule()`, um evento aparece no Google Calendar da clínica (quando conectado)
- A entrada correspondente existe em `clinic_appointment_gcal_events`
- Quando o appointment é cancelado, o evento some do Google Calendar
- Quando o appointment é remarcado, o horário do evento no Google Calendar é atualizado
- Se a clínica não tem Google Calendar conectado (`isConnected = false`), os handlers retornam silenciosamente sem erro
- Falhas na API do Google são logadas mas não propagam como exceção
