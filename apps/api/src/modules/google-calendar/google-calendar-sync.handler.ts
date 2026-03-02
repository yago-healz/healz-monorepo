import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import { appointmentView } from '../../infrastructure/database/schema/appointment-view.schema'
import { IEventBus } from '../../infrastructure/event-sourcing/event-bus/event-bus.interface'
import { DomainEvent } from '../../infrastructure/event-sourcing/domain/domain-event.interface'
import { GoogleCalendarService } from './google-calendar.service'

@Injectable()
export class GoogleCalendarSyncHandler implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarSyncHandler.name)

  constructor(
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('AppointmentScheduled', { handle: (event) => this.onScheduled(event) })
    this.eventBus.subscribe('AppointmentRescheduled', {
      handle: (event) => this.onRescheduled(event),
    })
    this.eventBus.subscribe('AppointmentCancelled', { handle: (event) => this.onCancelled(event) })
    this.eventBus.subscribe('AppointmentConfirmed', { handle: (event) => this.onConfirmed(event) })
    this.eventBus.subscribe('AppointmentCompleted', { handle: (event) => this.onCompleted(event) })
    this.eventBus.subscribe('AppointmentNoShow', { handle: (event) => this.onNoShow(event) })
  }

  private async onScheduled(event: DomainEvent): Promise<void> {
    const { clinic_id: clinicId, event_data: data } = event
    if (!clinicId) return
    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    const startAt = new Date(data.scheduled_at)
    const endAt = new Date(startAt.getTime() + (data.duration as number) * 60 * 1000)

    try {
      await this.googleCalendarService.createEvent(clinicId, data.appointment_id as string, {
        summary: 'Consulta',
        description: data.reason ?? undefined,
        startAt,
        endAt,
      })
    } catch (err) {
      this.logger.error(
        `Failed to sync appointment ${data.appointment_id} to Google Calendar`,
        err,
      )
    }
  }

  private async onRescheduled(event: DomainEvent): Promise<void> {
    const { clinic_id: clinicId, event_data: data } = event
    if (!clinicId) return
    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    // Duration is not carried in the rescheduled event — fetch from projection
    const [appointment] = await db
      .select({ duration: appointmentView.duration })
      .from(appointmentView)
      .where(eq(appointmentView.id, data.appointment_id as string))
      .limit(1)

    const duration = appointment?.duration ?? 30
    const startAt = new Date(data.new_scheduled_at)
    const endAt = new Date(startAt.getTime() + duration * 60 * 1000)

    try {
      await this.googleCalendarService.updateEvent(clinicId, data.appointment_id as string, {
        startAt,
        endAt,
      })
    } catch (err) {
      this.logger.error(
        `Failed to update rescheduled appointment ${data.appointment_id} in Google Calendar`,
        err,
      )
    }
  }

  private async onCancelled(event: DomainEvent): Promise<void> {
    const { clinic_id: clinicId, event_data: data } = event
    if (!clinicId) return
    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    try {
      await this.googleCalendarService.deleteEvent(clinicId, data.appointment_id as string)
    } catch (err) {
      this.logger.error(
        `Failed to delete cancelled appointment ${data.appointment_id} from Google Calendar`,
        err,
      )
    }
  }

  private async onConfirmed(event: DomainEvent): Promise<void> {
    const { clinic_id: clinicId, event_data: data } = event
    if (!clinicId) return
    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    try {
      await this.googleCalendarService.updateEvent(clinicId, data.appointment_id as string, {
        summary: '✓ Consulta',
      })
    } catch (err) {
      this.logger.error(
        `Failed to update confirmed appointment ${data.appointment_id} in Google Calendar`,
        err,
      )
    }
  }

  private async onCompleted(event: DomainEvent): Promise<void> {
    const { clinic_id: clinicId, event_data: data } = event
    if (!clinicId) return
    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    try {
      await this.googleCalendarService.updateEvent(clinicId, data.appointment_id as string, {
        summary: '✅ Consulta',
      })
    } catch (err) {
      this.logger.error(
        `Failed to update completed appointment ${data.appointment_id} in Google Calendar`,
        err,
      )
    }
  }

  private async onNoShow(event: DomainEvent): Promise<void> {
    const { clinic_id: clinicId, event_data: data } = event
    if (!clinicId) return
    if (!(await this.googleCalendarService.isConnected(clinicId))) return

    try {
      await this.googleCalendarService.updateEvent(clinicId, data.appointment_id as string, {
        summary: '⚠️ Falta',
      })
    } catch (err) {
      this.logger.error(
        `Failed to update no-show appointment ${data.appointment_id} in Google Calendar`,
        err,
      )
    }
  }
}
