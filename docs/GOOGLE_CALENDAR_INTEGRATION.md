# Google Calendar Integration — AI Agent Guide

Guia de referência completo para agentes de IA trabalharem com features envolvendo Google Calendar no Healz.

---

## Visão Geral

O sistema suporta **duas integrações independentes** de Google Calendar:

| Entidade  | Propósito                                      | Tabela de credenciais                    |
|-----------|------------------------------------------------|------------------------------------------|
| **Clínica** | Sincronizar agendamentos no calendário da clínica | `clinic_google_calendar_credentials`   |
| **Médico**  | Sincronizar agendamentos no calendário pessoal do médico | `doctor_google_calendar_credentials` |

Quando um agendamento ocorre, o sistema **prioriza o médico**: se o médico tiver Google Calendar conectado, usa o dele. Caso contrário, usa o da clínica.

---

## Arquitetura Backend

### Módulo

```
apps/api/src/modules/google-calendar/
  google-calendar.module.ts           # Registra todos os providers e controllers
  google-calendar.service.ts          # Integração Google Calendar da CLINICA
  google-calendar.controller.ts       # Endpoints REST da CLINICA
  doctor-google-calendar.service.ts   # Integração Google Calendar do MEDICO
  doctor-google-calendar.controller.ts# Endpoints REST do MEDICO
  google-calendar-sync.handler.ts     # Event handler que reage a domain events
  google-calendar.types.ts            # Tipos compartilhados
```

### Tipos Compartilhados (`google-calendar.types.ts`)

```typescript
interface CalendarListEntry {
  id: string
  summary: string    // nome do calendário
  primary: boolean   // true = calendário principal
  accessRole: string // 'owner' | 'writer' | 'reader'
}

interface FreeBusySlot {
  start: string  // ISO 8601
  end: string    // ISO 8601
}

interface CreateEventParams {
  summary: string       // ex: "Consulta — João Silva"
  description?: string
  startAt: Date
  endAt: Date
  attendeeEmail?: string
}

interface GoogleCredentials {
  accessToken: string    // já decriptado
  refreshToken: string   // já decriptado
  tokenExpiresAt: Date
  selectedCalendarId: string
}

interface CalendarEventDto {
  id: string
  title: string
  start: string   // ISO 8601
  end: string     // ISO 8601
  allDay: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
}
```

---

## Banco de Dados

### Tabela: `clinic_google_calendar_credentials`
Definida em `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts`

- **Relação:** 1:1 com a clínica (`clinicId` unique)
- **Tokens:** criptografados com AES-256-GCM via `ENCRYPTION_KEY` env var
- `selectedCalendarId` — null ate a clinica completar a selecao de calendario
- `isActive` — false quando a clinica desconecta

### Tabela: `clinic_appointment_gcal_events`
Mapeamento `appointmentId <-> gcalEventId` para sincronizacao de updates/deletes.

### Tabela: `doctor_google_calendar_credentials`
Definida em `apps/api/src/infrastructure/database/schema/doctor-domain.schema.ts`

- **Relação:** N:N medico+clinica (unique index `uq_doctor_clinic_gcal`)
- `doctorId` referencia `users.id` (NAO `doctor_profiles.id`)
- Mesma estrategia de criptografia dos tokens

### Tabela: `doctor_appointment_gcal_events`
Mapeamento `appointmentId <-> gcalEventId` nivel medico.

### Nota Importante: `doctorId` vs `doctorProfileId`
Os servicos de calendario do medico recebem `doctorProfileId` nos endpoints, mas armazenam `userId` no banco. Ha um metodo interno `resolveUserId(doctorProfileId)` que faz essa conversao buscando em `doctor_profiles`.

---

## Variaveis de Ambiente Necessarias

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/v1/auth/google-calendar/callback
DOCTOR_GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/v1/auth/doctor-google-calendar/callback
ENCRYPTION_KEY=<64 hex chars = 32 bytes>
FRONTEND_URL=http://localhost:3000
CLINIC_TIMEZONE=America/Sao_Paulo   # fallback de timezone
```

---

## Fluxo OAuth (Clinica)

```
1. Frontend GET /clinics/:clinicId/connectors/google-calendar/auth-url
   -> Retorna { authUrl }

2. Frontend redireciona para authUrl (Google OAuth page)

3. Google redireciona para GET /auth/google-calendar/callback?code=...&state=...
   -> Salva tokens criptografados no banco
   -> Redireciona para: /clinic/settings?tab=conectores&gcal=pending-calendar-selection

4. Frontend detecta query param gcal=pending-calendar-selection
   -> Abre CalendarPickerModal

5. Frontend GET /clinics/:clinicId/connectors/google-calendar/calendars
   -> Lista calendarios disponiveis na conta Google

6. Frontend POST /clinics/:clinicId/connectors/google-calendar/select-calendar
   Body: { calendarId, calendarName }
   -> Persiste o calendario selecionado

7. Clinica esta conectada. isConnected() retorna true.
```

## Fluxo OAuth (Medico)

Identico ao da clinica, com diferencas:
- Endpoints incluem `:doctorId` no path
- Callback redireciona para `/clinic/profile?tab=conectores&gcal=pending-calendar-selection`
- Estado armazenado em `doctor_google_calendar_credentials` (chave doctorId+clinicId)

---

## Endpoints da Clinica

| Method | Path | Guard | Descricao |
|--------|------|-------|-----------|
| GET | `/clinics/:clinicId/connectors/google-calendar/auth-url` | JWT + IsClinicAdmin | Retorna URL OAuth |
| GET | `/auth/google-calendar/callback` | Publico (Google) | Callback OAuth |
| GET | `/clinics/:clinicId/connectors/google-calendar/calendars` | JWT + IsClinicAdmin | Lista calendarios |
| POST | `/clinics/:clinicId/connectors/google-calendar/select-calendar` | JWT + IsClinicAdmin | Seleciona calendario |
| DELETE | `/clinics/:clinicId/connectors/google-calendar` | JWT + IsClinicAdmin | Desconecta |

## Endpoints do Medico

| Method | Path | Guard | Descricao |
|--------|------|-------|-----------|
| GET | `/clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/auth-url` | JWT + IsClinicAdminOrSelfDoctor | Retorna URL OAuth |
| GET | `/auth/doctor-google-calendar/callback` | Publico (Google) | Callback OAuth |
| GET | `/clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/calendars` | JWT + IsClinicAdminOrSelfDoctor | Lista calendarios |
| POST | `/clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/select-calendar` | JWT + IsClinicAdminOrSelfDoctor | Seleciona calendario |
| DELETE | `/clinics/:clinicId/doctors/:doctorId/connectors/google-calendar` | JWT + IsClinicAdminOrSelfDoctor | Desconecta |
| GET | `/clinics/:clinicId/doctors/:doctorId/calendar/events` | JWT + IsClinicMember | Lista eventos do calendario |
| GET | `/clinics/:clinicId/doctors/:doctorId/connectors` | JWT + IsClinicAdminOrSelfDoctor | Status dos conectores |

---

## Sincronizacao Automatica de Agendamentos

O `GoogleCalendarSyncHandler` (`google-calendar-sync.handler.ts`) escuta domain events do event bus e sincroniza automaticamente:

| Domain Event | Acao no Google Calendar |
|---|---|
| `AppointmentScheduled` | `createEvent()` — cria evento |
| `AppointmentRescheduled` | `updateEvent()` — atualiza horario |
| `AppointmentCancelled` | `deleteEvent()` — remove evento |
| `AppointmentConfirmed` | `updateEvent()` — titulo "Consulta" |
| `AppointmentCompleted` | `updateEvent()` — titulo "Consulta" |
| `AppointmentNoShow` | `updateEvent()` — titulo "Falta" |

**Logica de prioridade:**
1. Se `doctorId` presente E medico tem GCal conectado → usa `DoctorGoogleCalendarService`
2. Senao se clinica tem GCal conectado → usa `GoogleCalendarService`
3. Senao → nenhuma acao

---

## Scopes OAuth Usados

```typescript
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'email',
]
```

---

## Renovacao Automatica de Token

O metodo `getAuthenticatedClient()` verifica automaticamente:
- Se o token expira em menos de 5 minutos → chama `refreshAccessToken()`
- Usa o `refresh_token` para obter novo `access_token`
- Persiste o novo token criptografado no banco

---

## Free/Busy (Disponibilidade)

O metodo `getFreeBusy(clinicId, date, timezone?)` retorna os slots ocupados de um dia.

**Detalhe importante de timezone:**
- Recebe uma `Date` JavaScript e um timezone IANA (ex: `America/Sao_Paulo`)
- Usa `Intl.DateTimeFormat` para calcular o offset correto naquela data especifica (respeita horario de verao)
- Consulta tanto `primary` quanto o `selectedCalendarId` e mescla os resultados
- Retorna array de `FreeBusySlot[]` com `start` e `end` em ISO 8601

**Uso tipico:**
```typescript
const busySlots = await googleCalendarService.getFreeBusy(clinicId, new Date(), 'America/Sao_Paulo')
// busySlots: [{ start: '2026-03-22T14:00:00Z', end: '2026-03-22T15:00:00Z' }]
```

---

## Lista de Eventos (Medico)

O metodo `listEvents(clinicId, doctorId, timeMin, timeMax)` retorna eventos em uma janela de tempo.

- `timeMin` e `timeMax` em ISO 8601
- `maxResults: 250`, ordenados por `startTime`
- Inclui eventos deletados (`showDeleted: true`) com `status: 'cancelled'`
- Normaliza eventos de dia inteiro (`allDay: true` quando nao tem `dateTime`)

---

## Arquitetura Frontend

### Arquivos Relevantes

```
apps/web/src/
  routes/_authenticated/clinic/schedule.tsx          # Pagina principal da agenda
  features/clinic/
    api/
      doctor-calendar.api.ts                          # Hook useDoctorCalendarEvents
      clinic-settings.api.ts                          # Hooks de connector da clinica
      doctors.api.ts                                  # Hooks de connector do medico
    components/
      schedule/
        schedule-calendar.tsx                         # Componente de calendario visual
        doctor-selector.tsx                           # Dropdown para selecionar medico
      settings/tabs/
        connectors-tab.tsx                            # Tab de conectores da clinica
        calendar-picker-modal.tsx                     # Modal de selecao de calendario (clinica)
      doctors/
        doctor-connectors-tab.tsx                     # Tab de conectores do medico (inclui modal)
  lib/api/
    endpoints.ts                                      # ENDPOINTS.DOCTORS.*
    clinic-settings-endpoints.ts                      # CLINIC_SETTINGS_ENDPOINTS.*
  types/
    doctor.types.ts                                   # CalendarEvent, DoctorProfile, etc.
```

### Tipo `CalendarEvent` (frontend)

```typescript
// apps/web/src/types/doctor.types.ts
interface CalendarEvent {
  id: string
  title: string
  start: string   // ISO 8601
  end: string     // ISO 8601
  allDay: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
}
```

### Endpoints Constants

```typescript
// ENDPOINTS.DOCTORS (endpoints.ts)
CONNECTORS: (clinicId, doctorId) => `/clinics/${clinicId}/doctors/${doctorId}/connectors`
GOOGLE_CALENDAR_AUTH_URL: (clinicId, doctorId) => `...connectors/google-calendar/auth-url`
GOOGLE_CALENDAR_CALENDARS: (clinicId, doctorId) => `...connectors/google-calendar/calendars`
GOOGLE_CALENDAR_SELECT: (clinicId, doctorId) => `...connectors/google-calendar/select-calendar`
GOOGLE_CALENDAR_DISCONNECT: (clinicId, doctorId) => `...connectors/google-calendar`
CALENDAR_EVENTS: (clinicId, doctorId) => `/clinics/${clinicId}/doctors/${doctorId}/calendar/events`

// CLINIC_SETTINGS_ENDPOINTS (clinic-settings-endpoints.ts)
GOOGLE_CALENDAR_AUTH_URL: (clinicId) => `/clinics/${clinicId}/connectors/google-calendar/auth-url`
GOOGLE_CALENDAR_CALENDARS: (clinicId) => `...connectors/google-calendar/calendars`
GOOGLE_CALENDAR_SELECT: (clinicId) => `...connectors/google-calendar/select-calendar`
GOOGLE_CALENDAR_DISCONNECT: (clinicId) => `/clinics/${clinicId}/connectors/google-calendar`
CONNECTORS: (clinicId) => `/clinics/${clinicId}/settings/connectors`
```

---

## Hook: `useDoctorCalendarEvents`

```typescript
// apps/web/src/features/clinic/api/doctor-calendar.api.ts
const { data: events, isLoading, error } = useDoctorCalendarEvents(
  doctorId,   // string | null — null desabilita a query
  timeMin,    // ISO 8601 string
  timeMax,    // ISO 8601 string
)
// Retorna CalendarEvent[]
// staleTime: 5 minutos
// QueryKey: ['doctor-calendar-events', clinicId, doctorId, timeMin, timeMax]
```

**Tratamento de erro 404:** Quando o medico nao tem GCal conectado, a API retorna 404. A pagina de agenda detecta isso e exibe mensagem "Este medico ainda nao conectou o Google Calendar".

---

## Componente `ScheduleCalendar`

```typescript
// apps/web/src/features/clinic/components/schedule/schedule-calendar.tsx
<ScheduleCalendar
  events={events}          // CalendarEvent[]
  isLoading={boolean}
  onRangeChange={(start: Date, end: Date) => void}
/>
```

**Biblioteca:** `react-big-calendar` com `dateFnsLocalizer` configurado para `pt-BR`.

**Views disponiveis:** `day` | `week` | `month` (toolbar customizado, sem `work_week` ou `agenda`).

**Configuracoes fixas:**
- `step={30}` — slots de 30 minutos
- `timeslots={2}` — 2 divisoes por slot
- `min` — 07:00
- `max` — 21:00
- `scrollToTime` — 08:00

**Estilos por status:**
- `cancelled` — opacidade 40% + riscado
- `tentative` — borda tracejada
- `confirmed` — padrao

---

## Pagina de Agenda (`/clinic/schedule`)

**Logica de role:**
- **Medico autenticado:** carrega automaticamente o proprio perfil (`useMyDoctorProfile`) e exibe o calendario sem `DoctorSelector`
- **Outros roles (admin, staff):** exibe `DoctorSelector` para escolher qual medico visualizar

**Range de tempo:** quando o usuario muda de view/data no calendario, `onRangeChange` e chamado com o novo range, que atualiza `timeRange` e dispara nova query.

---

## Hooks de Connector da Clinica

```typescript
// em clinic-settings.api.ts
const { data } = useClinicConnectors(clinicId)
// data: { googleCalendar: boolean, whatsapp: boolean }

const { data: calendars } = useGoogleCalendarCalendars(clinicId, enabled)
// enabled: boolean — controla quando buscar (so apos OAuth callback)

const { mutate: selectCalendar } = useSelectGoogleCalendar(clinicId)
selectCalendar({ calendarId, calendarName })

const { mutate: disconnect } = useDisconnectGoogleCalendar(clinicId)
```

## Hooks de Connector do Medico

```typescript
// em doctors.api.ts
const { data } = useDoctorConnectors(doctorId)
// data: { googleCalendar: boolean, whatsapp: boolean }

const { data: calendars } = useDoctorGoogleCalendarCalendars(doctorId, enabled)

const { mutate: selectCalendar } = useSelectDoctorGoogleCalendar(doctorId)

const { mutate: disconnect } = useDisconnectDoctorGoogleCalendar(doctorId)
```

---

## Tratamento do Callback OAuth no Frontend

Apos o OAuth, o Google redireciona o usuario de volta com query params. O frontend trata isso com `useEffect`:

```typescript
// ConnectorsTab (clinica)
if (search.gcal === 'pending-calendar-selection') {
  setCalendarPickerOpen(true)
  navigate({ search: (prev) => ({ ...prev }), replace: true }) // limpa query params
} else if (search.gcal === 'error') {
  toast.error(search.reason ?? 'Erro ao conectar Google Calendar.')
}

// DoctorConnectorsTab
// Mesma logica, porem recebe gcal e reason como props (vindo do search da rota pai)
```

---

## Adicionando Novas Features de Calendario

### Cenario 1: Nova sincronizacao automatica ao evento de dominio X

1. No `google-calendar-sync.handler.ts`, adicionar novo subscriber em `onModuleInit()`:
   ```typescript
   this.eventBus.subscribe('NovoDomainEvent', { handle: (event) => this.onNovo(event) })
   ```
2. Implementar `onNovo()` seguindo o padrao existente (prioridade medico > clinica)

### Cenario 2: Mostrar disponibilidade (slots livres) no frontend

1. Criar endpoint no backend que chame `getFreeBusy(clinicId, date, timezone)`
2. Calcular slots livres subtraindo os busy slots do horario de funcionamento
3. Usar `useDoctorCalendarEvents` como referencia para o hook no frontend

### Cenario 3: Nova view de calendario

1. Adicionar nova `View` ao array de views em `ScheduleCalendar`
2. Adicionar o label em `VIEW_LABELS`
3. Ajustar a logica de navegacao (prev/next) no toolbar customizado

### Cenario 4: Criar evento manualmente no Google Calendar

Usar o metodo existente diretamente:
```typescript
// Via GoogleCalendarService (clinica)
await this.googleCalendarService.createEvent(clinicId, appointmentId, {
  summary: 'Titulo',
  description: 'Descricao opcional',
  startAt: new Date(),
  endAt: new Date(),
  attendeeEmail: 'paciente@email.com', // opcional
})

// Via DoctorGoogleCalendarService (medico)
await this.doctorGoogleCalendarService.createEvent(clinicId, doctorProfileId, appointmentId, params)
```

---

## Atencoes e Armadilhas

### 1. `doctorId` e sempre o `doctorProfile.id` nos endpoints
Os parametros de rota usam `doctorProfileId`. Internamente, o servico chama `resolveUserId()` para converter para `userId`. Nunca passe `userId` diretamente nos endpoints.

### 2. Token de estado OAuth e in-memory
O `stateStore` e um `Map` em memoria (`Map<string, { clinicId, expiresAt }>`). Em ambiente multi-instancia (cluster), isso nao funciona. Para producao escalavel, e necessario mover o state store para o banco de dados.

### 3. Scope insuficiente apos reconexao
Se o usuario revogou permissoes e reconectou sem o escopo correto, a API lanca `ForbiddenException('GOOGLE_CALENDAR_REAUTH_REQUIRED')`. O frontend deve tratar esse erro mostrando a mensagem de reautorizacao no `CalendarPickerModal`.

### 4. Timezone
Sempre passar o timezone da clinica ao chamar `getFreeBusy()`. O fallback e `process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo'`. A implementacao usa `Intl.DateTimeFormat` para respeitar horario de verao automaticamente.

### 5. Limite de eventos
`listEvents()` usa `maxResults: 250`. Para ranges grandes (ex: mes inteiro com muitos eventos), isso pode ser insuficiente. Se necessario, implementar paginacao via `pageToken`.

### 6. Instalando react-big-calendar
Se adicionar a feature de calendario em outro modulo, instalar as dependencias:
```bash
cd apps/web
pnpm add react-big-calendar date-fns
pnpm add -D @types/react-big-calendar
```
E importar o CSS: `import 'react-big-calendar/lib/css/react-big-calendar.css'`
