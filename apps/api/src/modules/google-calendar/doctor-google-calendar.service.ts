import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { google, Auth } from 'googleapis'

type OAuth2Client = Auth.OAuth2Client
import * as crypto from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../../infrastructure/database'
import {
  doctorGoogleCalendarCredentials,
  doctorAppointmentGcalEvents,
  doctorProfiles,
} from '../../infrastructure/database/schema'
import {
  CalendarListEntry,
  CalendarEventDto,
  CreateEventParams,
  FreeBusySlot,
  GoogleCredentials,
} from './google-calendar.types'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'email',
]

// State tokens: uuid → { clinicId, userId, expiresAt }
const stateStore = new Map<string, { clinicId: string; userId: string; expiresAt: number }>()

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutos

@Injectable()
export class DoctorGoogleCalendarService {
  private readonly logger = new Logger(DoctorGoogleCalendarService.name)

  // ── Criptografia ─────────────────────────────────────────────────────────

  private getEncryptionKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY
    if (!hex || hex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
    }
    return Buffer.from(hex, 'hex')
  }

  private encrypt(text: string): string {
    const key = this.getEncryptionKey()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  private decrypt(encryptedText: string): string {
    const key = this.getEncryptionKey()
    const buf = Buffer.from(encryptedText, 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const ciphertext = buf.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
  }

  // ── OAuth Client ──────────────────────────────────────────────────────────

  private createOAuthClient(): OAuth2Client {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.DOCTOR_GOOGLE_CALENDAR_REDIRECT_URI,
    )
  }

  // ── State management ──────────────────────────────────────────────────────

  private cleanExpiredStates(): void {
    const now = Date.now()
    for (const [key, value] of stateStore.entries()) {
      if (value.expiresAt < now) {
        stateStore.delete(key)
      }
    }
  }

  // ── Resolve doctorProfileId → userId ─────────────────────────────────────

  private async resolveUserId(doctorProfileId: string): Promise<string> {
    const [profile] = await db
      .select({ userId: doctorProfiles.userId })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, doctorProfileId))
      .limit(1)
    if (!profile) throw new NotFoundException(`Doctor profile ${doctorProfileId} not found`)
    return profile.userId
  }

  // ── OAuth ─────────────────────────────────────────────────────────────────

  async getAuthUrl(clinicId: string, doctorId: string): Promise<string> {
    this.cleanExpiredStates()
    const userId = await this.resolveUserId(doctorId)
    const state = crypto.randomUUID()
    stateStore.set(state, { clinicId, userId, expiresAt: Date.now() + STATE_TTL_MS })

    const client = this.createOAuthClient()
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state,
    })
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ email: string; clinicId: string }> {
    const stateEntry = stateStore.get(state)
    if (!stateEntry || stateEntry.expiresAt < Date.now()) {
      throw new BadRequestException('Invalid or expired OAuth state token')
    }
    const { clinicId, userId } = stateEntry
    stateStore.delete(state)

    const client = this.createOAuthClient()
    const { tokens } = await client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new BadRequestException('Google did not return required tokens')
    }

    client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data: userInfo } = await oauth2.userinfo.get()
    const email = userInfo.email ?? ''

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000)

    const existing = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(doctorGoogleCalendarCredentials)
        .set({
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          tokenExpiresAt: expiresAt,
          googleAccountEmail: email,
          isActive: true,
          selectedCalendarId: null,
          selectedCalendarName: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(doctorGoogleCalendarCredentials.doctorId, userId),
            eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
          ),
        )
    } else {
      await db.insert(doctorGoogleCalendarCredentials).values({
        doctorId: userId,
        clinicId,
        accessToken: this.encrypt(tokens.access_token),
        refreshToken: this.encrypt(tokens.refresh_token),
        tokenExpiresAt: expiresAt,
        googleAccountEmail: email,
        isActive: true,
      })
    }

    return { email, clinicId }
  }

  async disconnect(clinicId: string, doctorId: string): Promise<void> {
    const userId = await this.resolveUserId(doctorId)
    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
        ),
      )
      .limit(1)

    if (!cred) return

    try {
      const client = this.createOAuthClient()
      client.setCredentials({ access_token: this.decrypt(cred.accessToken) })
      await client.revokeCredentials()
    } catch (err) {
      this.logger.warn(`Failed to revoke Google token for doctor ${doctorId}: ${err}`)
    }

    await db
      .update(doctorGoogleCalendarCredentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
        ),
      )
  }

  // ── Calendários ───────────────────────────────────────────────────────────

  async listCalendars(clinicId: string, doctorId: string): Promise<CalendarListEntry[]> {
    const userId = await this.resolveUserId(doctorId)
    const client = await this.getAuthenticatedClient(clinicId, userId)
    const cal = google.calendar({ version: 'v3', auth: client })
    try {
      const { data } = await cal.calendarList.list()
      return (data.items ?? []).map((item) => ({
        id: item.id ?? '',
        summary: item.summary ?? '',
        primary: item.primary ?? false,
        accessRole: item.accessRole ?? '',
      }))
    } catch (err: any) {
      if (err?.message?.includes('insufficient authentication scopes')) {
        throw new ForbiddenException('GOOGLE_CALENDAR_REAUTH_REQUIRED')
      }
      throw err
    }
  }

  async selectCalendar(
    clinicId: string,
    doctorId: string,
    calendarId: string,
    calendarName: string,
  ): Promise<void> {
    const userId = await this.resolveUserId(doctorId)
    await db
      .update(doctorGoogleCalendarCredentials)
      .set({
        selectedCalendarId: calendarId,
        selectedCalendarName: calendarName,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
        ),
      )
  }

  async isConnected(clinicId: string, doctorId: string): Promise<boolean> {
    const userId = await this.resolveUserId(doctorId)
    const [cred] = await db
      .select({
        isActive: doctorGoogleCalendarCredentials.isActive,
        selectedCalendarId: doctorGoogleCalendarCredentials.selectedCalendarId,
      })
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
        ),
      )
      .limit(1)

    return !!(cred?.isActive && cred?.selectedCalendarId)
  }

  // ── Calendar Events ───────────────────────────────────────────────────────

  async listEvents(
    clinicId: string,
    doctorId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarEventDto[]> {
    const userId = await this.resolveUserId(doctorId)
    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
          eq(doctorGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred?.selectedCalendarId) {
      throw new NotFoundException('Doctor does not have Google Calendar connected')
    }

    const client = await this.getAuthenticatedClient(clinicId, userId)
    const cal = google.calendar({ version: 'v3', auth: client })

    const { data } = await cal.events.list({
      calendarId: cred.selectedCalendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      showDeleted: true,
    })

    return (data.items ?? []).map((item) => {
      const allDay = !item.start?.dateTime
      const start = item.start?.dateTime ?? item.start?.date ?? timeMin
      const end = item.end?.dateTime ?? item.end?.date ?? timeMax
      const status = (item.status ?? 'confirmed') as 'confirmed' | 'tentative' | 'cancelled'
      return {
        id: item.id ?? '',
        title: item.summary ?? '(sem título)',
        start,
        end,
        allDay,
        status,
      }
    })
  }

  // ── Free/Busy ─────────────────────────────────────────────────────────────

  async getFreeBusy(clinicId: string, doctorId: string, date: Date, timezone?: string): Promise<FreeBusySlot[]> {
    const userId = await this.resolveUserId(doctorId)
    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
          eq(doctorGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred?.selectedCalendarId) return []

    const client = await this.getAuthenticatedClient(clinicId, userId)
    const cal = google.calendar({ version: 'v3', auth: client })

    const tz = timezone ?? (process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo')
    const localDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(date)

    const timeMin = this.localMidnight(localDateStr, tz, 'start')
    const timeMax = this.localMidnight(localDateStr, tz, 'end')

    const calendarIds = Array.from(
      new Set(['primary', cred.selectedCalendarId].filter(Boolean))
    )

    try {
      const { data } = await cal.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: calendarIds.map((id) => ({ id })),
        },
      })

      const busySlots: Array<{ start: string; end: string }> = []
      for (const calId of calendarIds) {
        const slots = data.calendars?.[calId]?.busy ?? []
        for (const slot of slots) {
          if (slot.start && slot.end) {
            busySlots.push({ start: slot.start, end: slot.end })
          }
        }
      }

      return busySlots
    } catch (err) {
      this.logger.error(`getFreeBusy failed for doctor ${doctorId}: ${err}`)
      return []
    }
  }

  private localMidnight(dateStr: string, timezone: string, boundary: 'start' | 'end'): Date {
    const timeStr = boundary === 'start' ? '00:00:00' : '23:59:59'
    const probe = new Date(`${dateStr}T12:00:00Z`)
    const offset = this.getTimezoneOffset(timezone, probe)
    const sign = offset >= 0 ? '+' : '-'
    const absOffset = Math.abs(offset)
    const hh = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const mm = String(absOffset % 60).padStart(2, '0')
    return new Date(`${dateStr}T${timeStr}${sign}${hh}:${mm}`)
  }

  private getTimezoneOffset(timezone: string, date: Date): number {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .reduce((acc, part) => {
        acc[part.type] = part.value
        return acc
      }, {} as Record<string, string>)

    const localDate = new Date(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    )
    return Math.round((localDate.getTime() - date.getTime()) / (60 * 1000))
  }

  // ── Eventos ───────────────────────────────────────────────────────────────

  async createEvent(
    clinicId: string,
    doctorId: string,
    appointmentId: string,
    params: CreateEventParams,
  ): Promise<string> {
    const userId = await this.resolveUserId(doctorId)
    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
          eq(doctorGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred?.selectedCalendarId) {
      throw new BadRequestException('Doctor does not have Google Calendar connected')
    }

    const client = await this.getAuthenticatedClient(clinicId, userId)
    const cal = google.calendar({ version: 'v3', auth: client })

    const event = await cal.events.insert({
      calendarId: cred.selectedCalendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startAt.toISOString() },
        end: { dateTime: params.endAt.toISOString() },
        attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
      },
    })

    const gcalEventId = event.data.id!

    await db.insert(doctorAppointmentGcalEvents).values({
      doctorId: userId,
      clinicId,
      appointmentId,
      gcalEventId,
    })

    return gcalEventId
  }

  async updateEvent(
    clinicId: string,
    doctorId: string,
    appointmentId: string,
    params: Partial<CreateEventParams>,
  ): Promise<void> {
    const userId = await this.resolveUserId(doctorId)
    const [mapping] = await db
      .select()
      .from(doctorAppointmentGcalEvents)
      .where(eq(doctorAppointmentGcalEvents.appointmentId, appointmentId))
      .limit(1)

    if (!mapping) {
      this.logger.warn(`No doctor gcal event mapping found for appointment ${appointmentId}`)
      return
    }

    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
          eq(doctorGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred?.selectedCalendarId) return

    const client = await this.getAuthenticatedClient(clinicId, userId)
    const cal = google.calendar({ version: 'v3', auth: client })

    const patch: Record<string, unknown> = {}
    if (params.summary) patch.summary = params.summary
    if (params.description !== undefined) patch.description = params.description
    if (params.startAt) patch.start = { dateTime: params.startAt.toISOString() }
    if (params.endAt) patch.end = { dateTime: params.endAt.toISOString() }

    await cal.events.patch({
      calendarId: cred.selectedCalendarId,
      eventId: mapping.gcalEventId,
      requestBody: patch,
    })
  }

  async deleteEvent(clinicId: string, doctorId: string, appointmentId: string): Promise<void> {
    const userId = await this.resolveUserId(doctorId)
    const [mapping] = await db
      .select()
      .from(doctorAppointmentGcalEvents)
      .where(eq(doctorAppointmentGcalEvents.appointmentId, appointmentId))
      .limit(1)

    if (!mapping) return

    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
          eq(doctorGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (cred?.selectedCalendarId) {
      try {
        const client = await this.getAuthenticatedClient(clinicId, userId)
        const cal = google.calendar({ version: 'v3', auth: client })
        await cal.events.delete({
          calendarId: cred.selectedCalendarId,
          eventId: mapping.gcalEventId,
        })
      } catch (err) {
        this.logger.warn(`Failed to delete doctor gcal event for appointment ${appointmentId}: ${err}`)
      }
    }

    await db
      .delete(doctorAppointmentGcalEvents)
      .where(eq(doctorAppointmentGcalEvents.appointmentId, appointmentId))
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private async getCredentials(clinicId: string, userId: string): Promise<GoogleCredentials> {
    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
          eq(doctorGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred) {
      throw new NotFoundException(`No active Google Calendar credentials for user ${userId}`)
    }

    return {
      accessToken: this.decrypt(cred.accessToken),
      refreshToken: this.decrypt(cred.refreshToken),
      tokenExpiresAt: cred.tokenExpiresAt,
      selectedCalendarId: cred.selectedCalendarId ?? '',
    }
  }

  private async refreshAccessToken(clinicId: string, userId: string): Promise<void> {
    const [cred] = await db
      .select()
      .from(doctorGoogleCalendarCredentials)
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
        ),
      )
      .limit(1)

    if (!cred) return

    const client = this.createOAuthClient()
    client.setCredentials({ refresh_token: this.decrypt(cred.refreshToken) })
    const { credentials } = await client.refreshAccessToken()

    const newAccessToken = credentials.access_token!
    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000)

    await db
      .update(doctorGoogleCalendarCredentials)
      .set({
        accessToken: this.encrypt(newAccessToken),
        tokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(doctorGoogleCalendarCredentials.doctorId, userId),
          eq(doctorGoogleCalendarCredentials.clinicId, clinicId),
        ),
      )

    this.logger.log(`Refreshed Google Calendar access token for user ${userId}`)
  }

  private async getAuthenticatedClient(clinicId: string, userId: string): Promise<OAuth2Client> {
    const creds = await this.getCredentials(clinicId, userId)

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
    if (creds.tokenExpiresAt < fiveMinutesFromNow) {
      await this.refreshAccessToken(clinicId, userId)
      const refreshed = await this.getCredentials(clinicId, userId)
      creds.accessToken = refreshed.accessToken
    }

    const client = this.createOAuthClient()
    client.setCredentials({ access_token: creds.accessToken })
    return client
  }
}
