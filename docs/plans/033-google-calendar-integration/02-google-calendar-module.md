# Tarefa 02 — Google Calendar Module (Backend)

**Objetivo:** Criar o módulo NestJS `GoogleCalendarModule` com o serviço central que encapsula toda interação com a Google Calendar API: OAuth, listagem de calendários, Free/Busy, CRUD de eventos e gestão de tokens.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/modules/google-calendar/google-calendar.module.ts` | Criar |
| `apps/api/src/modules/google-calendar/google-calendar.service.ts` | Criar |
| `apps/api/src/modules/google-calendar/google-calendar.types.ts` | Criar |
| `apps/api/src/app.module.ts` | Modificar — importar `GoogleCalendarModule` |
| `apps/api/.env` / `.env.example` | Modificar — adicionar variáveis Google |

---

## Dependência npm

```bash
cd apps/api
pnpm add googleapis
```

---

## Implementação

### 1. Tipos (`google-calendar.types.ts`)

```typescript
export interface CalendarListEntry {
  id: string
  summary: string        // nome do calendário
  primary: boolean       // true = calendário principal
  accessRole: string     // 'owner' | 'writer' | 'reader'
}

export interface FreeBusySlot {
  start: string  // ISO 8601
  end: string    // ISO 8601
}

export interface CreateEventParams {
  summary: string        // ex: "Consulta — João Silva"
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
```

### 2. Serviço (`google-calendar.service.ts`)

Interface pública do serviço:

```typescript
@Injectable()
export class GoogleCalendarService {

  // ── OAuth ──────────────────────────────────────────────────────

  /** Gera a URL de autorização OAuth para redirecionar o usuário */
  getAuthUrl(clinicId: string): string

  /**
   * Troca o authorization code por access + refresh tokens.
   * Salva os tokens criptografados no banco.
   * Retorna o email da conta Google vinculada.
   */
  handleOAuthCallback(code: string, clinicId: string): Promise<{ email: string }>

  /**
   * Revoga tokens e marca credencial como inativa (isActive = false).
   * Não deleta o registro para preservar histórico.
   */
  disconnect(clinicId: string): Promise<void>

  // ── Calendários ────────────────────────────────────────────────

  /** Lista os calendários disponíveis na conta Google vinculada */
  listCalendars(clinicId: string): Promise<CalendarListEntry[]>

  /** Persiste o calendário escolhido pela clínica */
  selectCalendar(clinicId: string, calendarId: string, calendarName: string): Promise<void>

  /** Retorna true se a clínica tem credencial ativa com calendário selecionado */
  isConnected(clinicId: string): Promise<boolean>

  // ── Free/Busy ──────────────────────────────────────────────────

  /**
   * Consulta os períodos ocupados no calendário da clínica para uma data.
   * Usa a Free/Busy API do Google Calendar.
   * Retorna array de intervalos { start, end } em UTC.
   */
  getFreeBusy(clinicId: string, date: Date): Promise<FreeBusySlot[]>

  // ── Eventos ────────────────────────────────────────────────────

  /**
   * Cria um evento no Google Calendar para o appointment.
   * Salva o mapping appointmentId <-> gcalEventId na tabela clinic_appointment_gcal_events.
   */
  createEvent(clinicId: string, appointmentId: string, params: CreateEventParams): Promise<string>

  /** Atualiza um evento existente (reschedule, etc.) */
  updateEvent(clinicId: string, appointmentId: string, params: Partial<CreateEventParams>): Promise<void>

  /** Remove o evento do Google Calendar e o mapping do banco */
  deleteEvent(clinicId: string, appointmentId: string): Promise<void>

  // ── Internos ───────────────────────────────────────────────────

  /** Retorna um OAuth2Client autenticado, renovando o access token se necessário */
  private getAuthenticatedClient(clinicId: string): Promise<OAuth2Client>

  /** Renova o access token usando o refresh token armazenado */
  private refreshAccessToken(clinicId: string): Promise<void>
}
```

#### Detalhes de implementação importantes

**OAuth Client:** Usar `google.auth.OAuth2` da lib `googleapis` com:
```typescript
new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI,
)
```

**Scopes necessários:**
```typescript
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'email',  // para capturar o email da conta Google
]
```

**State parameter no OAuth:** Para vincular o callback ao `clinicId` sem expor dados sensíveis, usar um token de estado temporário:
- Ao gerar a auth URL, criar um UUID aleatório, armazená-lo em memória (Map com TTL de 10 min) associado ao `clinicId`
- Incluir esse UUID como `state` na URL
- No callback, lookup do UUID → `clinicId`

**Criptografia de tokens:** Usar `crypto` nativo do Node.js com AES-256-GCM:
```typescript
// Encrypt: retorna string base64 com IV + tag + ciphertext
encrypt(text: string): string

// Decrypt: recebe string base64, retorna texto original
decrypt(encryptedText: string): string
```
Chave: `process.env.ENCRYPTION_KEY` (32 bytes hex).

**Auto-refresh:** Em `getAuthenticatedClient()`, antes de usar o token, verificar se `tokenExpiresAt < now + 5min`. Se sim, chamar `refreshAccessToken()`.

### 3. Módulo (`google-calendar.module.ts`)

```typescript
@Module({
  imports: [DrizzleModule],  // ou o módulo de DB usado no projeto
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
```

### 4. Variáveis de ambiente (`.env.example`)

Adicionar:
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/v1/auth/google-calendar/callback
ENCRYPTION_KEY=  # gerar com: openssl rand -hex 32
```

---

## Critério de aceite

- `GoogleCalendarService` é injetável em outros módulos via `GoogleCalendarModule`
- `getAuthUrl()` retorna uma URL válida com os scopes corretos
- `handleOAuthCallback()` salva tokens criptografados no banco (os tokens no banco NÃO devem ser legíveis em texto puro)
- `getFreeBusy()` retorna array (vazio se não há eventos) sem lançar exceção quando não há busy slots
- `isConnected()` retorna `false` quando credencial não existe ou `isActive = false` ou `selectedCalendarId = null`
- TypeScript compila sem erros
