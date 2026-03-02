export interface CalendarListEntry {
  id: string
  summary: string      // nome do calendário
  primary: boolean     // true = calendário principal
  accessRole: string   // 'owner' | 'writer' | 'reader'
}

export interface FreeBusySlot {
  start: string  // ISO 8601
  end: string    // ISO 8601
}

export interface CreateEventParams {
  summary: string       // ex: "Consulta — João Silva"
  description?: string
  startAt: Date
  endAt: Date
  attendeeEmail?: string // email do paciente se disponível
}

export interface GoogleCredentials {
  accessToken: string    // já decriptado
  refreshToken: string   // já decriptado
  tokenExpiresAt: Date
  selectedCalendarId: string
}
