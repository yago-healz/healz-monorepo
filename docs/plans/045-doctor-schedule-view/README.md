# 045 - Visualizacao da Agenda do Medico (Fase 1 - Read-Only)

## Objetivo

Implementar a visualizacao da agenda do medico exibindo compromissos do Google Calendar.
Escopo: somente leitura (read-only). Sem criacao/edicao de eventos.

## Decisoes Tomadas

| Decisao | Escolha | Justificativa |
|---|---|---|
| Fetch vs Sync | Fetch em tempo real | Simplicidade; fase 1 read-only; sync na fase 2+ |
| Receptionist ve todos medicos | Sim | Nao existe tabela de vinculo receptionist->doctor |
| Medico sem conexao Google | Mostrar mensagem "sem conexao" | Nao fazer fallback para credenciais da clinica |
| Eventos cancelados | Mostrar com visual diferente (riscado/transparente) | Visibilidade sem poluir agenda |
| View default | Dia | Contexto medico: foco no dia atual |
| Prioridade credenciais | Doctor first, fallback clinic | Mesma logica do GoogleCalendarSyncHandler |
| Biblioteca calendario | react-big-calendar | Madura, suporta day/week/month, customizavel |
| Testes automatizados | Nao nesta fase | Foco em entrega funcional |

## Perfis de Acesso

| Role | Comportamento |
|---|---|
| `doctor` | Sem seletor. Carrega propria agenda automaticamente |
| `receptionist` | Seletor com todos os medicos da clinica. Exige selecao |
| `manager` / `admin` | Seletor com todos os medicos da clinica. Exige selecao |

## Arquitetura

```
Frontend                    Backend                     Google
   |                          |                            |
   |-- GET /doctors --------->|                            |
   |<-- [doctor list] --------|                            |
   |                          |                            |
   |-- GET /doctors/:id/      |                            |
   |   calendar/events ------>|                            |
   |                          |-- getCredentials(doctor) ->|
   |                          |   (fallback: clinic creds) |
   |                          |<- tokens ------------------|
   |                          |                            |
   |                          |-- events.list(calendarId,  |
   |                          |   timeMin, timeMax) ------>|
   |                          |<- events[] ----------------|
   |                          |                            |
   |<-- CalendarEvent[] ------|                            |
```

## Tarefas de Implementacao

### Tarefa 1: Backend - Metodo `listEvents` no DoctorGoogleCalendarService
**Arquivo:** `apps/api/src/modules/google-calendar/doctor-google-calendar.service.ts`

Adicionar metodo:
```typescript
async listEvents(
  clinicId: string,
  doctorId: string,
  timeMin: string, // ISO 8601
  timeMax: string, // ISO 8601
): Promise<CalendarEventDto[]>
```

Logica:
1. Resolver `userId` a partir de `doctorId` (via `resolveUserId`)
2. Buscar credenciais do medico (`doctorGoogleCalendarCredentials`)
3. Se nao encontrar, lancar excecao indicando "nao conectado"
4. Obter authenticated client (reusa `getAuthenticatedClient`)
5. Chamar `calendar.events.list()` com:
   - `calendarId`: `selectedCalendarId` das credenciais
   - `timeMin`, `timeMax`
   - `singleEvents: true` (expande eventos recorrentes)
   - `orderBy: 'startTime'`
   - `maxResults: 250`
6. Mapear resposta para `CalendarEventDto[]`
7. Incluir eventos cancelados (status: 'cancelled') na resposta

**Novo tipo em `google-calendar.types.ts`:**
```typescript
export interface CalendarEventDto {
  id: string
  title: string
  start: string       // ISO 8601
  end: string         // ISO 8601
  allDay: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
}
```

---

### Tarefa 2: Backend - Endpoint REST para listar eventos
**Arquivo:** `apps/api/src/modules/google-calendar/doctor-google-calendar.controller.ts`

Adicionar rota:
```
GET /clinics/:clinicId/doctors/:doctorId/calendar/events?timeMin=...&timeMax=...
```

- Guard: `JwtAuthGuard` + guard customizado (ver Tarefa 3)
- Query params validados com class-validator:
  - `timeMin` (string, required, ISO date)
  - `timeMax` (string, required, ISO date)
- Retorna `CalendarEventDto[]`
- Se medico nao conectado, retornar 404 com mensagem clara

**DTO de query:**
```typescript
class ListCalendarEventsQueryDto {
  @IsString() @IsNotEmpty()
  timeMin: string

  @IsString() @IsNotEmpty()
  timeMax: string
}
```

---

### Tarefa 3: Backend - Guard de acesso para agenda
**Arquivo:** `apps/api/src/common/guards/is-clinic-member.guard.ts` (novo)

O guard `IsClinicAdminOrSelfDoctorGuard` existente nao cobre `receptionist`.
Criar guard `IsClinicMemberGuard` que permite acesso se:
- O usuario pertence a mesma clinica (tem qualquer role em `clinicAccess` para o `clinicId` do param)

Alternativa: estender o guard existente. Avaliar o que for mais simples.

O controle fino e:
- `doctor` so pode acessar `doctorId` = seu proprio userId (validar no controller ou guard)
- `receptionist`, `manager`, `admin` podem acessar qualquer `doctorId` da clinica

---

### Tarefa 4: Frontend - Instalar dependencias
```bash
cd apps/web && pnpm add react-big-calendar date-fns
cd apps/web && pnpm add -D @types/react-big-calendar
```

`date-fns` ja esta instalado. Verificar se a versao e compativel com o localizer do react-big-calendar.

---

### Tarefa 5: Frontend - Endpoint e hook de API
**Arquivo:** `apps/web/src/lib/api/endpoints.ts`

Adicionar:
```typescript
DOCTORS: {
  // ... existentes
  CALENDAR_EVENTS: (clinicId: string, doctorId: string) =>
    `/clinics/${clinicId}/doctors/${doctorId}/calendar/events`,
}
```

**Arquivo:** `apps/web/src/features/clinic/api/doctor-calendar.api.ts` (novo)

```typescript
// Hook: useDoctorCalendarEvents(doctorId, timeMin, timeMax)
// - Query key: ['doctor-calendar-events', clinicId, doctorId, timeMin, timeMax]
// - staleTime: 5 minutos
// - enabled: apenas quando doctorId esta definido
// - Retorna CalendarEventDto[]

// Hook: useClinicDoctorsList()
// - Reutilizar query existente de listagem de medicos se houver
// - Ou criar query simples para GET /clinics/:clinicId/doctors
// - Retorna lista com { id, name, specialty, photoUrl }
```

**Arquivo:** `apps/web/src/types/doctor.types.ts`

Adicionar tipo:
```typescript
export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
}
```

---

### Tarefa 6: Frontend - Componente DoctorSelector
**Arquivo:** `apps/web/src/features/clinic/components/schedule/doctor-selector.tsx` (novo)

- Combobox ou Select com lista de medicos da clinica
- Props: `doctors`, `selectedDoctorId`, `onSelect`, `isLoading`
- Mostra nome + especialidade + foto (avatar)
- Renderizacao condicional baseada em role:
  - `doctor` -> componente nao renderiza (auto-selecao no pai)
  - Demais roles -> renderiza normalmente
- Usar componentes Shadcn existentes (Select ou Command/Combobox)

---

### Tarefa 7: Frontend - Componente ScheduleCalendar
**Arquivo:** `apps/web/src/features/clinic/components/schedule/schedule-calendar.tsx` (novo)

Wrapper do `react-big-calendar`:
- Configurar localizer com `date-fns` e locale `pt-BR`
- Props: `events: CalendarEvent[]`, `isLoading: boolean`, `onRangeChange`
- Views disponiveis: day (default), week, month
- Toolbar customizada com:
  - Navegacao: anterior / hoje / proximo
  - Seletor de view: dia / semana / mes
  - Label da data atual
- Customizacao visual:
  - Eventos cancelados: opacity reduzida + texto riscado (line-through)
  - Eventos tentative: borda pontilhada
  - Eventos confirmed: cor solida padrao
- Slot de horario: 30 minutos
- Horario visivel: 07:00 - 21:00 (scrollTo 08:00)
- Formatos pt-BR para horas e datas
- CSS: importar `react-big-calendar/lib/css/react-big-calendar.css` + overrides com Tailwind

---

### Tarefa 8: Frontend - Pagina de Agenda (substituir placeholder)
**Arquivo:** `apps/web/src/routes/_authenticated/clinic/schedule.tsx`

Composicao da pagina:

```
+------------------------------------------+
| Header: "Agenda"  [DoctorSelector]       |
+------------------------------------------+
|                                          |
|          ScheduleCalendar                |
|          (react-big-calendar)            |
|                                          |
+------------------------------------------+
```

Logica:
1. Usar `useUserRole()` para determinar role
2. Se `doctor`:
   - Buscar `doctorId` do usuario atual (via `useMyDoctorProfile()` -> doctorProfile.id)
   - Auto-selecionar, sem seletor visivel
3. Se `receptionist` / `manager` / `admin`:
   - Carregar lista de medicos (`useClinicDoctorsList()`)
   - Mostrar `DoctorSelector`
   - Nenhum medico selecionado por default -> estado "selecione um medico"
4. Quando medico selecionado:
   - Calcular `timeMin`/`timeMax` baseado na view atual do calendario
   - Chamar `useDoctorCalendarEvents(doctorId, timeMin, timeMax)`
   - Mapear eventos para formato do react-big-calendar: `new Date(event.start)`, `new Date(event.end)`
5. Quando view/range muda:
   - Atualizar `timeMin`/`timeMax` -> nova query automatica via Tanstack Query

Estados da UI:
- **Sem medico selecionado** (non-doctor): mensagem centralizada "Selecione um medico para visualizar a agenda"
- **Loading**: skeleton ou spinner sobreposto ao calendario
- **Sem conexao Google** (404 do endpoint): mensagem "Este medico ainda nao conectou o Google Calendar" + botao para configurar (se for o proprio medico ou admin)
- **Sem eventos**: calendario vazio (comportamento natural do react-big-calendar)
- **Erro**: toast de erro via Sonner

---

## Ordem de Execucao

```
Tarefa 1 (backend service)
    |
    v
Tarefa 2 (backend endpoint) + Tarefa 3 (backend guard)  [paralelo]
    |
    v
Tarefa 4 (instalar deps)
    |
    v
Tarefa 5 (frontend api hooks)
    |
    v
Tarefa 6 (DoctorSelector) + Tarefa 7 (ScheduleCalendar)  [paralelo]
    |
    v
Tarefa 8 (pagina final - composicao)
```

## Arquivos Modificados (existentes)

| Arquivo | Mudanca |
|---|---|
| `apps/api/src/modules/google-calendar/doctor-google-calendar.service.ts` | Adicionar `listEvents()` |
| `apps/api/src/modules/google-calendar/doctor-google-calendar.controller.ts` | Adicionar rota GET events |
| `apps/api/src/modules/google-calendar/google-calendar.types.ts` | Adicionar `CalendarEventDto` |
| `apps/web/src/lib/api/endpoints.ts` | Adicionar `CALENDAR_EVENTS` |
| `apps/web/src/types/doctor.types.ts` | Adicionar `CalendarEvent` |
| `apps/web/src/routes/_authenticated/clinic/schedule.tsx` | Substituir placeholder |

## Arquivos Novos

| Arquivo | Descricao |
|---|---|
| `apps/api/src/common/guards/is-clinic-member.guard.ts` | Guard que permite qualquer membro da clinica |
| `apps/web/src/features/clinic/api/doctor-calendar.api.ts` | Hooks de API para eventos do calendario |
| `apps/web/src/features/clinic/components/schedule/doctor-selector.tsx` | Seletor de medico por role |
| `apps/web/src/features/clinic/components/schedule/schedule-calendar.tsx` | Wrapper react-big-calendar |

## Riscos

| Risco | Mitigacao |
|---|---|
| Rate limit Google API | `staleTime: 5min` no frontend; `maxResults: 250` na query |
| Token expirado/revogado | Auto-refresh existente; frontend trata 403 com mensagem de reconexao |
| CSS do react-big-calendar conflitando com Tailwind | Importar CSS base e fazer overrides pontuais |
| Eventos recorrentes | `singleEvents: true` na API do Google expande para instancias individuais |
| All-day events em timezone errado | Detectar via `start.date` (sem dateTime) e marcar `allDay: true` |

## Fora de Escopo (fases futuras)

- Criacao/edicao de eventos pela aplicacao
- Sincronizacao bidirecional com Google Calendar
- Tabela local de eventos
- Vinculo explicito receptionist -> medicos
- Drag-and-drop no calendario
- Notificacoes/lembretes
- Cache no backend
