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
  clinicGoogleCalendarCredentials,
  clinicAppointmentGcalEvents,
} from '../../infrastructure/database/schema'
import {
  CalendarListEntry,
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

// State tokens: uuid → { clinicId, expiresAt }
const stateStore = new Map<string, { clinicId: string; expiresAt: number }>()

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutos

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name)

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
    // Formato: iv(12) + tag(16) + ciphertext — tudo em base64
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
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
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

  // ── OAuth ─────────────────────────────────────────────────────────────────

  getAuthUrl(clinicId: string): string {
    this.cleanExpiredStates()
    const state = crypto.randomUUID()
    stateStore.set(state, { clinicId, expiresAt: Date.now() + STATE_TTL_MS })

    const client = this.createOAuthClient()
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // garante refresh_token mesmo em re-autorização
      state,
    })
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ email: string; clinicId: string }> {
    // Resolve clinicId via state token
    const stateEntry = stateStore.get(state)
    if (!stateEntry || stateEntry.expiresAt < Date.now()) {
      throw new BadRequestException('Invalid or expired OAuth state token')
    }
    const { clinicId } = stateEntry
    stateStore.delete(state)

    const client = this.createOAuthClient()
    const { tokens } = await client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new BadRequestException('Google did not return required tokens')
    }

    // Capturar email da conta Google
    client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data: userInfo } = await oauth2.userinfo.get()
    const email = userInfo.email ?? ''

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000)

    // Salvar tokens criptografados (upsert)
    const existing = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(clinicGoogleCalendarCredentials)
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
        .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))
    } else {
      await db.insert(clinicGoogleCalendarCredentials).values({
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

  async disconnect(clinicId: string): Promise<void> {
    const [cred] = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))
      .limit(1)

    if (!cred) return

    // Revogar token junto ao Google
    try {
      const client = this.createOAuthClient()
      client.setCredentials({ access_token: this.decrypt(cred.accessToken) })
      await client.revokeCredentials()
    } catch (err) {
      this.logger.warn(`Failed to revoke Google token for clinic ${clinicId}: ${err}`)
    }

    await db
      .update(clinicGoogleCalendarCredentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))
  }

  // ── Calendários ───────────────────────────────────────────────────────────

  async listCalendars(clinicId: string): Promise<CalendarListEntry[]> {
    const client = await this.getAuthenticatedClient(clinicId)
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
    calendarId: string,
    calendarName: string,
  ): Promise<void> {
    await db
      .update(clinicGoogleCalendarCredentials)
      .set({
        selectedCalendarId: calendarId,
        selectedCalendarName: calendarName,
        updatedAt: new Date(),
      })
      .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))
  }

  async isConnected(clinicId: string): Promise<boolean> {
    const [cred] = await db
      .select({
        isActive: clinicGoogleCalendarCredentials.isActive,
        selectedCalendarId: clinicGoogleCalendarCredentials.selectedCalendarId,
      })
      .from(clinicGoogleCalendarCredentials)
      .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))
      .limit(1)

    return !!(cred?.isActive && cred?.selectedCalendarId)
  }

  // ── Free/Busy ─────────────────────────────────────────────────────────────

  async getFreeBusy(clinicId: string, date: Date, timezone?: string): Promise<FreeBusySlot[]> {
    const [cred] = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(
        and(
          eq(clinicGoogleCalendarCredentials.clinicId, clinicId),
          eq(clinicGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred?.selectedCalendarId) return []

    const client = await this.getAuthenticatedClient(clinicId)
    const cal = google.calendar({ version: 'v3', auth: client })

    // Obter YYYY-MM-DD no timezone da clínica
    const tz = timezone ?? (process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo')
    const localDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(date)

    // Construir a janela (00:00:00 a 23:59:59) no timezone local, convertendo para ISO com offset
    const timeMin = this.localMidnight(localDateStr, tz, 'start')
    const timeMax = this.localMidnight(localDateStr, tz, 'end')

    try {
      const { data } = await cal.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: cred.selectedCalendarId }],
        },
      })

      const busySlots = data.calendars?.[cred.selectedCalendarId]?.busy ?? []
      return busySlots.map((slot) => ({
        start: slot.start ?? '',
        end: slot.end ?? '',
      }))
    } catch (err) {
      this.logger.error(`getFreeBusy failed for clinic ${clinicId}: ${err}`)
      return []
    }
  }

  /**
   * Retorna Date correspondente a 00:00:00 ou 23:59:59 no timezone dado.
   * Usa Intl.DateTimeFormat para calcular o offset do timezone naquela data.
   */
  private localMidnight(
    dateStr: string,
    timezone: string,
    boundary: 'start' | 'end',
  ): Date {
    const timeStr = boundary === 'start' ? '00:00:00' : '23:59:59'
    // Construir uma string ISO sem offset e descobrir o offset real do timezone
    const probe = new Date(`${dateStr}T12:00:00Z`) // Usar UTC como base
    const offset = this.getTimezoneOffset(timezone, probe)

    // Formatar offset para string ISO: +HH:MM ou -HH:MM
    const sign = offset <= 0 ? '+' : '-'
    const absOffset = Math.abs(offset)
    const hh = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const mm = String(absOffset % 60).padStart(2, '0')

    return new Date(`${dateStr}T${timeStr}${sign}${hh}:${mm}`)
  }

  /**
   * Retorna offset em minutos: UTC - local
   * Negativo para UTC+, positivo para UTC-
   * Exemplo: UTC-3 = +180, UTC+1 = -60
   */
  private getTimezoneOffset(timezone: string, date: Date): number {
    // Formatar a data como YYYY-MM-DD HH:MM:SS no timezone alvo
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

    // Reconstruir como Date (interpretado como UTC, mas com valores locais do timezone)
    const localDate = new Date(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    )

    // Calcular a diferença: quanto um Date em UTC difere do mesmo "relógio" no timezone local
    return Math.round((localDate.getTime() - date.getTime()) / (60 * 1000))
  }

  // ── Eventos ───────────────────────────────────────────────────────────────

  async createEvent(
    clinicId: string,
    appointmentId: string,
    params: CreateEventParams,
  ): Promise<string> {
    const [cred] = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(
        and(
          eq(clinicGoogleCalendarCredentials.clinicId, clinicId),
          eq(clinicGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred?.selectedCalendarId) {
      throw new BadRequestException('Clinic does not have Google Calendar connected')
    }

    const client = await this.getAuthenticatedClient(clinicId)
    const cal = google.calendar({ version: 'v3', auth: client })

    const event = await cal.events.insert({
      calendarId: cred.selectedCalendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startAt.toISOString() },
        end: { dateTime: params.endAt.toISOString() },
        attendees: params.attendeeEmail
          ? [{ email: params.attendeeEmail }]
          : undefined,
      },
    })

    const gcalEventId = event.data.id!

    // Salvar mapping appointmentId <-> gcalEventId
    await db.insert(clinicAppointmentGcalEvents).values({
      clinicId,
      appointmentId,
      gcalEventId,
    })

    return gcalEventId
  }

  async updateEvent(
    clinicId: string,
    appointmentId: string,
    params: Partial<CreateEventParams>,
  ): Promise<void> {
    const [mapping] = await db
      .select()
      .from(clinicAppointmentGcalEvents)
      .where(eq(clinicAppointmentGcalEvents.appointmentId, appointmentId))
      .limit(1)

    if (!mapping) {
      this.logger.warn(`No gcal event mapping found for appointment ${appointmentId}`)
      return
    }

    const [cred] = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(
        and(
          eq(clinicGoogleCalendarCredentials.clinicId, clinicId),
          eq(clinicGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred?.selectedCalendarId) return

    const client = await this.getAuthenticatedClient(clinicId)
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

  async deleteEvent(clinicId: string, appointmentId: string): Promise<void> {
    const [mapping] = await db
      .select()
      .from(clinicAppointmentGcalEvents)
      .where(eq(clinicAppointmentGcalEvents.appointmentId, appointmentId))
      .limit(1)

    if (!mapping) return

    const [cred] = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(
        and(
          eq(clinicGoogleCalendarCredentials.clinicId, clinicId),
          eq(clinicGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (cred?.selectedCalendarId) {
      try {
        const client = await this.getAuthenticatedClient(clinicId)
        const cal = google.calendar({ version: 'v3', auth: client })
        await cal.events.delete({
          calendarId: cred.selectedCalendarId,
          eventId: mapping.gcalEventId,
        })
      } catch (err) {
        this.logger.warn(`Failed to delete gcal event for appointment ${appointmentId}: ${err}`)
      }
    }

    await db
      .delete(clinicAppointmentGcalEvents)
      .where(eq(clinicAppointmentGcalEvents.appointmentId, appointmentId))
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private async getCredentials(clinicId: string): Promise<GoogleCredentials> {
    const [cred] = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(
        and(
          eq(clinicGoogleCalendarCredentials.clinicId, clinicId),
          eq(clinicGoogleCalendarCredentials.isActive, true),
        ),
      )
      .limit(1)

    if (!cred) {
      throw new NotFoundException(`No active Google Calendar credentials for clinic ${clinicId}`)
    }

    return {
      accessToken: this.decrypt(cred.accessToken),
      refreshToken: this.decrypt(cred.refreshToken),
      tokenExpiresAt: cred.tokenExpiresAt,
      selectedCalendarId: cred.selectedCalendarId ?? '',
    }
  }

  private async refreshAccessToken(clinicId: string): Promise<void> {
    const [cred] = await db
      .select()
      .from(clinicGoogleCalendarCredentials)
      .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))
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
      .update(clinicGoogleCalendarCredentials)
      .set({
        accessToken: this.encrypt(newAccessToken),
        tokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(clinicGoogleCalendarCredentials.clinicId, clinicId))

    this.logger.log(`Refreshed Google Calendar access token for clinic ${clinicId}`)
  }

  private async getAuthenticatedClient(clinicId: string): Promise<OAuth2Client> {
    const creds = await this.getCredentials(clinicId)

    // Renova o token se expira em menos de 5 minutos
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
    if (creds.tokenExpiresAt < fiveMinutesFromNow) {
      await this.refreshAccessToken(clinicId)
      // Re-buscar após refresh
      const refreshed = await this.getCredentials(clinicId)
      creds.accessToken = refreshed.accessToken
    }

    const client = this.createOAuthClient()
    client.setCredentials({ access_token: creds.accessToken })
    return client
  }
}
