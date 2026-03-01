# Plano 033 — Integração Google Calendar

**Objetivo:** Permitir que clínicas conectem sua conta Google Calendar, habilitando a Carol a consultar disponibilidade real e registrar agendamentos automaticamente na agenda da clínica.

---

## Contexto

A aba "Conectores" em `/clinic/settings` já possui a UI placeholder com o botão "Vincular" para Google Calendar (`connectors-tab.tsx`). O botão hoje faz um simples PATCH boolean — sem OAuth real.

A Carol já possui duas ferramentas mockadas que serão ativadas por esta integração:
- `CheckAvailabilityTool` — retorna slots simulados hardcodados
- `CreateAppointmentTool` — não cria nada no banco (mock)

O sistema de agendamentos usa event sourcing com um event bus RabbitMQ, o que nos permite reagir a eventos de appointment de forma desacoplada.

---

## Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---|---|---|
| **Callback OAuth** | Backend (`/auth/google-calendar/callback`) | Tokens nunca passam pelo browser |
| **Direção de sync** | One-way: nosso sistema → Google Calendar | Fonte da verdade é nosso DB; menor complexidade para MVP |
| **Verificação de disponibilidade** | Fusão: agenda da clínica (nosso DB) + Google Calendar Free/Busy API | Captura bloqueios manuais na agenda Google (feriados, reuniões pessoais) |
| **Seleção de calendário** | Após OAuth, clínica escolhe qual calendário usar | Mais profissional; clínica pode ter calendário dedicado para consultas |

---

## Fluxo OAuth Completo

```
[Frontend]                     [Backend]                   [Google]
    │                              │                            │
    │── GET auth-url ─────────────>│                            │
    │<─ { authUrl } ───────────────│                            │
    │                              │                            │
    │── window.location = authUrl ─────────────────────────────>│
    │                              │                            │
    │                              │<── callback?code=...&state= ─│
    │                              │── troca code por tokens ──>│
    │                              │<── { access_token, refresh_token }│
    │                              │                            │
    │                              │── salva tokens (encrypted) │
    │                              │── redireciona frontend     │
    │<── /clinic/settings?gcal=pending-calendar-selection ──────│
    │                              │                            │
    │── GET /calendars ───────────>│                            │
    │                              │── Google Calendar API ────>│
    │<─ [lista de calendários] ────│                            │
    │                              │                            │
    │── POST /select-calendar ────>│                            │
    │<─ 200 OK ────────────────────│                            │
    │                              │                            │
    │ [status: Conectado ✓]        │                            │
```

---

## Fluxo de Sync de Agendamentos

```
[Carol / User] → AppointmentService.schedule()
                    │
                    ├── salva no DB (event sourcing)
                    └── publica AppointmentScheduled (RabbitMQ)
                              │
                    GoogleCalendarEventHandler
                              │
                    ├── clínica tem Google Calendar conectado?
                    │     Não → ignora
                    │     Sim ↓
                    ├── cria evento no Google Calendar
                    └── salva mapping appointmentId ↔ gcalEventId
```

---

## Disponibilidade via CheckAvailabilityTool

```
CheckAvailabilityTool._call({ date })
    │
    ├── 1. busca weeklySchedule da clínica → gera slots candidatos
    ├── 2. busca agendamentos existentes no nosso DB para a data
    ├── 3. se Google Calendar conectado:
    │       └── chama Free/Busy API para a data
    └── 4. remove slots ocupados (nosso DB + Google Calendar)
         retorna slots livres reais
```

---

## Tabelas Novas

### `clinic_google_calendar_credentials`
Armazena credenciais OAuth por clínica.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `clinic_id` | uuid FK unique | Uma credencial por clínica |
| `access_token` | text | Criptografado com AES-256 |
| `refresh_token` | text | Criptografado com AES-256 |
| `token_expires_at` | timestamp | Expiração do access token |
| `selected_calendar_id` | varchar | ID do calendário escolhido (nullable até seleção) |
| `selected_calendar_name` | varchar | Nome amigável do calendário |
| `google_account_email` | varchar | Email da conta Google vinculada |
| `is_active` | boolean | false = desconectado |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

### `clinic_appointment_gcal_events`
Mapeia appointments do nosso sistema para eventos do Google Calendar.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `clinic_id` | uuid FK | — |
| `appointment_id` | uuid unique | FK para appointment_view |
| `gcal_event_id` | varchar | ID do evento no Google Calendar |
| `created_at` | timestamp | — |

---

## Endpoints Novos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clinics/:id/connectors/google-calendar/auth-url` | Retorna URL de autenticação OAuth |
| `GET` | `/auth/google-calendar/callback` | Callback OAuth (público, sem auth guard) |
| `GET` | `/clinics/:id/connectors/google-calendar/calendars` | Lista calendários disponíveis |
| `POST` | `/clinics/:id/connectors/google-calendar/select-calendar` | Seleciona calendário |
| `DELETE` | `/clinics/:id/connectors/google-calendar` | Desconecta e revoga tokens |
| `GET` | `/clinics/:id/settings/connectors` | Status dos conectores (existente, implementar backend) |

---

## Variáveis de Ambiente Necessárias

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/v1/auth/google-calendar/callback
ENCRYPTION_KEY=                # 32 bytes hex para AES-256
```

---

## Tarefas

| # | Arquivo | Descrição | Depende de |
|---|---|---|---|
| [01](./01-database.md) | Schema + migration | Novas tabelas e migration Drizzle | — |
| [02](./02-google-calendar-module.md) | `GoogleCalendarModule` | Serviço OAuth + API Google Calendar | 01 |
| [03](./03-api-endpoints.md) | Controller + endpoints | REST endpoints OAuth e calendários | 02 |
| [04](./04-appointment-sync.md) | Event handler | Sync appointments → Google Calendar | 02 |
| [05](./05-check-availability-tool.md) | `CheckAvailabilityTool` | Substituir mock por dados reais | 02 |
| [06](./06-frontend-oauth-flow.md) | Frontend | OAuth redirect + calendar picker + status | 03 |

---

## Ordem de Execução

```
1. [01-database.md]
   — bloqueio para todos os outros

2. [02-google-calendar-module.md]
   — bloqueio para 03, 04, 05

3. [03-api-endpoints.md] + [04-appointment-sync.md] + [05-check-availability-tool.md]
   — podem rodar em paralelo (dependem apenas de 02)

4. [06-frontend-oauth-flow.md]
   — depende de 03 (endpoints de auth e calendários)
```

---

## Fora do Escopo

- Sincronização bidirecional (Google Calendar → nosso sistema)
- Integração WhatsApp
- `CreateAppointmentTool` com implementação real (requer gestão de pacientes — plano separado)
- Webhooks do Google Calendar (push notifications)
- Testes automatizados (e2e / unit)
- Multi-calendário por clínica (hoje: 1 calendário por clínica)
