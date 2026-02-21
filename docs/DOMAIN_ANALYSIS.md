# Análise de Domínio — Healz API

> Análise estratégica DDD realizada em 2026-02-21
> Metodologia: DDD Strategic Design — Identificação de Subdomínios e Bounded Contexts

---

## Visão Geral da Arquitetura

- **15 módulos** NestJS identificados
- **Event Sourcing** com RabbitMQ nos domínios core (`patient`, `conversation`, `appointment`, `patient-journey`)
- **Multi-tenancy** via Row-Level Security (PostgreSQL session var `app.current_org_id`)
- **CQRS**: Write via Aggregates + Event Store; Read via Projection Views
- **Base URL**: `http://localhost:3001/api/v1`

---

## Mapa de Domínios

### Domain: Identity & Access

**Tipo**: Supporting Subdomain
**Módulos**: `auth`, `signup`, `invites`

**Linguagem Ubíqua**: `User`, `Session`, `Token`, `Verification`, `Invite`, `Role`, `Clinic Access`

**Capacidade de Negócio**: Controla quem pode entrar no sistema, com que identidade e em qual contexto de clínica.

**Conceitos-chave**:

| Conceito | Tipo | Descrição |
|---------|------|-----------|
| `AuthService` | Service | Login, logout, switch de contexto, refresh token com detecção de roubo de família |
| `SignupService` | UseCase | Auto-registro B2B: cria Org + Clínica + Usuário + Role em transação atômica |
| `InvitesService` | UseCase | Convite de membros com aceitação e auto-login |
| `RefreshToken` | Entity | Rotação com revogação por família inteira (theft detection) |
| `JwtPayload` | Value Object | `userId`, `organizationId?`, `activeClinicId?`, `clinicAccess[]`, `isPlatformAdmin` |

**Subdomínios**:

1. **Authentication** (Supporting) — Login, JWT, RefreshToken, Logout, SwitchContext — Coesão: **9/10 ✅**
2. **Registration** (Supporting) — Signup, EmailVerification, PasswordReset — Coesão: **8/10 ✅**
3. **Membership** (Supporting) — Invite, AcceptInvite, UserClinicRole — Coesão: **8/10 ✅**

**Bounded Context Sugerido**: `IdentityContext`

**Dependências**:
- → `MailContext` via `MailService` (envio de emails transacionais)
- → `AuditContext` via fire-and-forget

**Coesão Geral**: **9/10 ✅**

---

### Domain: Tenant Management

**Tipo**: Supporting Subdomain
**Módulos**: `organizations`, `clinics`

**Linguagem Ubíqua**: `Organization`, `Clinic`, `Tenant`, `Member`, `Ownership`

**Capacidade de Negócio**: Representa a estrutura hierárquica de clientes da plataforma (multi-tenancy B2B).

**Conceitos-chave**:

| Conceito | Tipo | Descrição |
|---------|------|-----------|
| `Organization` | Entity | Tenant raiz com `slug` único |
| `Clinic` | Entity | Unidade operacional dentro de uma org |
| `OrganizationsService.createClinic()` | UseCase | Expande tenant criando nova clínica |
| `ClinicsService.addMember()` | UseCase | Vincula usuário a clínica com role |

> **Observação**: Módulos extremamente finos — cada um tem apenas 1 método de serviço. A lógica real está dispersa em `SignupModule` e `PlatformAdminModule`.

**Bounded Context Sugerido**: `TenantContext`

**Dependências**:
- ← `IdentityContext` (usuários precisam existir antes de serem adicionados)

**Coesão**: **8/10 ✅** (mas módulos anêmicos — ver Issues)

---

### Domain: Platform Administration

**Tipo**: Supporting Subdomain
**Módulos**: `platform-admin`

**Linguagem Ubíqua**: `PlatformAdmin`, `Impersonation`, `Session Revocation`, `Organization Management`, `User Management`

**Capacidade de Negócio**: Backoffice interno da Healz para gerenciar clientes, usuários e suporte operacional.

**Conceitos-chave**:

| Conceito | Tipo | Descrição |
|---------|------|-----------|
| `PlatformAdminOrganizationsService` | Service | CRUD orgs com cascade de deactivation para clínicas |
| `PlatformAdminClinicsService` | Service | CRUD clínicas com transferência entre orgs |
| `PlatformAdminUsersService` | Service | CRUD usuários, gestão de roles, force-verify email |
| `PlatformAdminImpersonationService` | Service | JWT de 5min como outro usuário com flag `isImpersonating` |
| `PlatformAdminAdminsService` | Service | Gestão de quem possui privilégios de platform admin |

**Bounded Context Sugerido**: `PlatformAdminContext`

**Dependências**:
- → `IdentityContext` (opera diretamente sobre entidades de outro contexto — ver Issues)
- → `MailContext` (resend invite)

**Coesão**: **8/10 ✅**

---

### Domain: Patient ⭐ Core

**Tipo**: Core Domain
**Módulos**: `patient`

**Linguagem Ubíqua**: `Patient`, `Registration`, `Phone`, `Status`

**Capacidade de Negócio**: Entidade central do negócio — o paciente é o sujeito de todas as operações clínicas.

**Conceitos-chave**:

| Conceito | Tipo | Descrição |
|---------|------|-----------|
| `Patient` | Aggregate Root | Identidade por telefone, estados: `active/inactive/suspended` |
| `RegisterPatientHandler` | Command Handler | Persiste via event store, publica `PatientRegistered` |
| `UpdatePatientHandler` | Command Handler | Carrega histórico, aplica update, publica `PatientUpdated` |
| `PatientProjectionHandler` | Projection | Mantém `patient_view` para leitura |

**Eventos de Domínio**: `PatientRegistered`, `PatientUpdated`

**Bounded Context Sugerido**: `PatientContext`

**Integração**:
- Publica: `PatientRegistered` → consumido por `PatientJourneyContext`
- Leitura: `patient_view` referenciado por `ConversationContext`, `AppointmentContext`

**Coesão**: **8/10 ✅**

---

### Domain: Clinical Communication ⭐ Core

**Tipo**: Core Domain
**Módulos**: `conversation`, `carol`, `messaging`

**Linguagem Ubíqua**: `Conversation`, `Message`, `Intent`, `Channel`, `Escalation`, `Bot`

**Capacidade de Negócio**: Comunicação omnicanal (WhatsApp/web/SMS) com pacientes via bot com IA, escalando para humano quando necessário. **Diferencial competitivo da Healz.**

**Conceitos-chave**:

| Conceito | Tipo | Descrição |
|---------|------|-----------|
| `Conversation` | Aggregate Root | Lifecycle: `active → escalated/resolved/abandoned`; regra: max 3 msgs consecutivas do bot |
| `ReceiveMessageHandler` | Command Handler | Cria/retoma conversa, detecta intenção, escala se necessário |
| `IIntentDetector` | Port (interface) | Contrato para engine de IA (Carol) |
| `MockIntentDetector` | Adapter | 8 intenções por regex: `schedule_appointment`, `confirm_appointment`, `cancel_appointment`, `reschedule_appointment`, `request_info`, `request_human`, `greeting`, `goodbye` |
| `IMessagingGateway` | Port (interface) | Contrato para providers externos (WhatsApp, SMS) |
| `MockMessagingGateway` | Adapter | Implementação in-memory para dev/testes |

**Eventos de Domínio**: `ConversationStarted`, `MessageReceived`, `MessageSent`, `IntentDetected`, `ConversationEscalated`

**Subdomínios**:
1. **Messaging** (Supporting) — envio/recebimento via gateways externos
2. **Conversation** (Core) — lifecycle da conversa e business rules
3. **Intent Detection / Carol** (Core) — classificação de intenção com IA

**Bounded Context Sugerido**: `ClinicalCommunicationContext`

**Dependências**:
- → `PatientContext` (referencia `patientId`)
- → `CarolContext` / `IIntentDetector` — **acoplamento direto via DI** (ver Issue #1)
- Publica: `MessageReceived`, `ConversationEscalated` → `PatientJourneyContext`

**Coesão**: **7/10 ⚠️** (ver Issue #1)

---

### Domain: Scheduling ⭐ Core

**Tipo**: Core Domain
**Módulos**: `appointment`

**Linguagem Ubíqua**: `Appointment`, `Scheduling`, `Confirmation`, `Cancellation`, `No-show`, `Doctor`

**Capacidade de Negócio**: Gestão completa do ciclo de vida de agendamentos clínicos com detecção de conflitos de horário.

**Conceitos-chave**:

| Conceito | Tipo | Descrição |
|---------|------|-----------|
| `Appointment` | Aggregate Root | 5 estados: `scheduled → confirmed → completed/cancelled/no_show` |
| `AppointmentService` | Application Service | Verifica conflitos via `appointment_view` antes de criar |
| `AppointmentProjectionHandler` | Projection | Mantém `appointment_view` para leitura e verificação de conflitos |

**Eventos de Domínio**: `AppointmentScheduled`, `AppointmentConfirmed`, `AppointmentCancelled`, `AppointmentRescheduled`, `AppointmentCompleted`, `AppointmentNoShow`

**Business Rules**:
- Data futura obrigatória
- Duração: 1–480 min
- Não pode cancelar se já completado
- Não pode dar no-show se já confirmado
- Reschedule apenas de `scheduled/confirmed`

**Bounded Context Sugerido**: `SchedulingContext`

**Integração**:
- Publica: 5 eventos → `PatientJourneyContext` (consumidor mais ativo)

**Coesão**: **9/10 ✅**

---

### Domain: Patient Journey ⭐⭐ Core (Principal diferencial)

**Tipo**: Core Domain
**Módulos**: `patient-journey`

**Linguagem Ubíqua**: `Journey`, `Stage`, `Risk Score`, `Milestone`, `Transition`, `Risk Factor`

**Capacidade de Negócio**: Rastreia a jornada completa do paciente desde lead até tratamento concluído, calculando risco de abandono e orquestrando transições automáticas. **É o coração inteligente da plataforma Healz.**

**Conceitos-chave**:

| Conceito | Tipo | Descrição |
|---------|------|-----------|
| `PatientJourney` | Aggregate Root | Máquina de estados com 8 stages |
| `JourneyStage` | Value Object | `LEAD → ENGAGED → SCHEDULED → CONFIRMED → IN_TREATMENT → COMPLETED \| DROPPED \| AT_RISK` |
| `RiskScore` | Value Object | Cálculo ponderado com 6 fatores de risco |
| `PatientJourneyProcessManager` | Process Manager (Saga) | Orquestra transições reagindo a eventos de Patient, Conversation, Appointment |

**Fatores de Risco (com pesos)**:

| Fator | Peso | Score |
|-------|------|-------|
| `NO_SHOW` | 1.0 | 100 |
| `FREQUENT_CANCELLATIONS` | 0.8 | 75 |
| `UNRESPONSIVE` | 0.6 | 60 |
| `NOT_CONFIRMED` | 0.5 | 50 |
| `MULTIPLE_RESCHEDULES` | 0.4 | 40 |
| `INACTIVE` | 0.3 | 30 |

**Milestones**: `first_message`, `first_appointment`, `first_consultation_completed`

**Mapa de Reações do Process Manager**:

| Evento Externo | Ação na Journey |
|---------------|----------------|
| `PatientRegistered` | Start journey em `LEAD` |
| `MessageReceived` | `LEAD → ENGAGED`; milestone `first_message` |
| `AppointmentScheduled` | `ENGAGED/AT_RISK → SCHEDULED`; milestone `first_appointment` |
| `AppointmentConfirmed` | `SCHEDULED → CONFIRMED` |
| `AppointmentCancelled` | Se ≥ 2 cancelamentos: detecta risco `FREQUENT_CANCELLATIONS`; senão → `ENGAGED` |
| `AppointmentNoShow` | Detecta risco `NO_SHOW` (auto-transita para `AT_RISK` se score alto) |
| `AppointmentCompleted` | → `IN_TREATMENT`; milestone `first_consultation_completed` |

**Eventos de Domínio**: `JourneyStarted`, `JourneyStageChanged`, `RiskDetected`, `RiskScoreRecalculated`, `JourneyMilestoneReached`

**Bounded Context Sugerido**: `PatientJourneyContext`

**Dependências (via eventos — correto)**:
- ← `PatientContext` (`PatientRegistered`)
- ← `ClinicalCommunicationContext` (`MessageReceived`)
- ← `SchedulingContext` (`AppointmentScheduled`, `Confirmed`, `Cancelled`, `Completed`, `NoShow`)

**Coesão**: **7/10 ⚠️** (inerente ao design de Process Manager — aceitável)

---

### Domain: Cross-cutting Infrastructure

**Tipo**: Generic Subdomain
**Módulos**: `audit`, `mail`, `event-sourcing`

| Módulo | Responsabilidade |
|--------|-----------------|
| `AuditService` | Fire-and-forget logging de ações HTTP (nunca lança exceção) |
| `MailService` | Envio via Resend API (verification, reset, invite) — sender: `noreply@contact.healz.com.br` |
| `EventStoreService` | Persistência de eventos com locking otimista (unique index `aggregate_id + version`) |
| `RabbitMQEventBus` | Pub/sub via topic exchange `healz.events`, DLQ em `healz.events.failed` |

**Bounded Context Sugerido**: `InfrastructureContext` (Shared Kernel)

---

## Mapa do Event Bus (RabbitMQ)

| Evento | Publicado por | Consumidores |
|--------|--------------|--------------|
| `PatientRegistered` | `RegisterPatientHandler` | `PatientProjectionHandler`, `PatientJourneyProcessManager` |
| `PatientUpdated` | `UpdatePatientHandler` | `PatientProjectionHandler` |
| `ConversationStarted` | `ReceiveMessageHandler` | `ConversationProjectionHandler` |
| `MessageReceived` | `ReceiveMessageHandler` | `ConversationProjectionHandler`, `PatientJourneyProcessManager` |
| `MessageSent` | `ReceiveMessageHandler` | `ConversationProjectionHandler` |
| `IntentDetected` | `ReceiveMessageHandler` | `ConversationProjectionHandler` |
| `ConversationEscalated` | `ReceiveMessageHandler` | `ConversationProjectionHandler` |
| `AppointmentScheduled` | `AppointmentService` | `AppointmentProjectionHandler`, `PatientJourneyProcessManager` |
| `AppointmentConfirmed` | `AppointmentService` | `AppointmentProjectionHandler`, `PatientJourneyProcessManager` |
| `AppointmentCancelled` | `AppointmentService` | `AppointmentProjectionHandler`, `PatientJourneyProcessManager` |
| `AppointmentRescheduled` | `AppointmentService` | `AppointmentProjectionHandler` |
| `AppointmentCompleted` | `AppointmentService` | `AppointmentProjectionHandler`, `PatientJourneyProcessManager` |
| `AppointmentNoShow` | `AppointmentService` | `AppointmentProjectionHandler`, `PatientJourneyProcessManager` |
| `JourneyStarted` | `PatientJourneyProcessManager` | `JourneyProjectionHandler` |
| `JourneyStageChanged` | `PatientJourneyProcessManager` | `JourneyProjectionHandler` |
| `RiskDetected` | `PatientJourneyProcessManager` | `JourneyProjectionHandler` |
| `RiskScoreRecalculated` | `PatientJourneyProcessManager` | `JourneyProjectionHandler` |
| `JourneyMilestoneReached` | `PatientJourneyProcessManager` | `JourneyProjectionHandler` |

---

## Matriz de Coesão Cross-Domain

| Contexto A | Contexto B | Coesão | Problema | Recomendação |
|-----------|-----------|--------|----------|--------------|
| `ConversationContext` | `CarolContext` | 5/10 ⚠️ | Dependência direta via DI (síncrona) | Extrair para evento async |
| `PatientJourneyContext` | `SchedulingContext` | 8/10 ✅ | Acoplamento via eventos (correto) | Manter |
| `IdentityContext` | `TenantContext` | 6/10 ⚠️ | `Signup` cria Org+Clinic+User em transação única | Ver Issue #3 |
| `PlatformAdminContext` | `IdentityContext` | 4/10 ❌ | Opera diretamente sobre schema de outro contexto | Anti-corruption layer |
| `TenantContext` | todos | 9/10 ✅ | `tenantId`/`clinicId` como Shared Kernel nos eventos | Aceitável (design intencional) |

---

## Issues de Baixa Coesão

### Prioridade: Alta

#### Issue #1: `ConversationContext` acoplado diretamente a `CarolContext`

- **Localização**: `src/conversation/conversation.module.ts` importa `CarolModule`; `ReceiveMessageHandler` injeta `IIntentDetector`
- **Problema**: `Conversation` precisa detectar intenção de forma **síncrona** dentro do mesmo command handler. Qualquer mudança na interface de Carol quebra Conversation. Os dois contextos evoluem juntos sem necessidade.
- **Coesão**: 5/10 ⚠️
- **Recomendação**: Separar em dois passos assíncronos:
  1. `ReceiveMessageHandler` emite `MessageReceived` (sem detectar intenção)
  2. `CarolContext` assina `MessageReceived`, detecta intenção e emite `IntentDetected`
  3. `ConversationProjectionHandler` reage a `IntentDetected` atualizando a view

  Resultado: `ConversationModule` e `CarolModule` se tornam completamente independentes.

#### Issue #2: `PlatformAdminContext` acessa schema interno de outros contextos

- **Localização**: `src/platform-admin/services/*.service.ts` — queries Drizzle diretas nas tabelas `users`, `organizations`, `clinics`, `user_clinic_roles`, `invites`
- **Problema**: PlatformAdmin conhece o schema interno de múltiplos bounded contexts. Qualquer renomeação de coluna ou tabela em qualquer domínio pode quebrar o admin silenciosamente.
- **Coesão**: 4/10 ❌
- **Recomendação**:
  - **Pragmática** (curto prazo): Aceitar o acoplamento como trade-off intencional de backoffice, documentar explicitamente que PlatformAdmin é uma "visão administrativa transversal".
  - **Ideal** (longo prazo): Cada contexto expõe interfaces de repositório administrativo (`IAdminUserRepository`, `IAdminOrgRepository`) que PlatformAdmin consome sem conhecer o schema.

### Prioridade: Média

#### Issue #3: `SignupService` orquestra múltiplos contextos em transação única

- **Localização**: `src/signup/signup.service.ts`
- **Problema**: Uma transação atômica cria `Organization` + `Clinic` + `User` + `UserClinicRole`, acoplando `TenantContext` e `IdentityContext` em uma única operação de Application Layer.
- **Coesão**: 6/10 ⚠️
- **Recomendação**: Manter a transação por now (consistência > pureza no signup B2B). A longo prazo, considerar evento `OrganizationRegistered` que `IdentityContext` reaja criando o usuário admin via eventual consistency. Avaliar se o custo vale.

#### Issue #4: `TenantContext` com módulos anêmicos

- **Localização**: `src/organizations/` (1 método), `src/clinics/` (1 método)
- **Problema**: Esses módulos são cascos vazios — a lógica real está em `PlatformAdminModule` e `SignupModule`. Há fragmentação de responsabilidade.
- **Coesão**: 6/10 ⚠️
- **Recomendação**: Mover `createClinic` e `addMember` para dentro do próprio `TenantContext` como comandos de domínio, enriquecendo o contexto. Ou consolidar operações administrativas em `PlatformAdminContext` e remover os módulos finos.

### Prioridade: Baixa

#### Issue #5: Conceito `User` com significados diferentes entre contextos

- **Localização**: Múltiplos módulos
- **Problema**: "User" significa coisas diferentes em cada contexto:
  - Em `auth`: sujeito autenticado com tokens
  - Em `invites`: membro pendente com email
  - Em `appointment`: `doctorId` (profissional de saúde)
  - Em `platform-admin`: entidade gerenciada
- **Recomendação**: Adotar nomenclatura específica por contexto — `AuthenticatedUser`, `InvitedMember`, `HealthProfessional`, `ManagedUser`. Não requer refatoração imediata mas deve guiar nomenclatura futura.

---

## Bounded Context Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HEALZ PLATFORM                               │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │  IdentityContext  │    │  TenantContext    │                      │
│  │  (Supporting)     │◄───│  (Supporting)     │                      │
│  │                   │    │                   │                      │
│  │ auth, signup,     │    │ organizations,    │                      │
│  │ invites           │    │ clinics           │                      │
│  └────────┬──────────┘    └──────────────────┘                      │
│           │                        ▲                                 │
│           │              ┌─────────┴────────┐                       │
│           └─────────────►│PlatformAdminCtx  │                       │
│                          │  (Supporting)    │                       │
│                          │ platform-admin   │                       │
│                          └──────────────────┘                       │
│                                                                     │
│  ╔══════════════════════════════════════════════════════════╗       │
│  ║                    CORE DOMAINS                          ║       │
│  ║                                                          ║       │
│  ║  ┌─────────────┐  PatientRegistered  ┌────────────────┐ ║       │
│  ║  │PatientCtx   │────────────────────►│                │ ║       │
│  ║  │  (Core)     │                     │PatientJourney  │ ║       │
│  ║  │ patient     │   MessageReceived   │    Context     │ ║       │
│  ║  └─────────────┘  ┌─────────────────►│  (Core ⭐⭐)   │ ║       │
│  ║                   │                  │                │ ║       │
│  ║  ┌────────────────┴──┐  Appointment  │ patient-       │ ║       │
│  ║  │ClinicalCommCtx    │  events ──────►│ journey        │ ║       │
│  ║  │  (Core)           │               └────────────────┘ ║       │
│  ║  │ conversation,     │                                   ║       │
│  ║  │ carol, messaging  │                                   ║       │
│  ║  └───────────────────┘                                   ║       │
│  ║                                                          ║       │
│  ║  ┌─────────────────────────────────────────────────┐    ║       │
│  ║  │  SchedulingContext (Core)                        │    ║       │
│  ║  │  appointment                                     │    ║       │
│  ║  └─────────────────────────────────────────────────┘    ║       │
│  ╚══════════════════════════════════════════════════════════╝       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  InfrastructureContext (Generic — Shared Kernel)          │       │
│  │  audit · mail · event-sourcing (EventStore + RabbitMQ)   │       │
│  └──────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Resumo Executivo

| Subdomain | Tipo | Coesão | Status |
|-----------|------|--------|--------|
| Authentication | Supporting | 9/10 ✅ | Sólido |
| Registration | Supporting | 8/10 ✅ | Sólido |
| Membership (Invites) | Supporting | 8/10 ✅ | Sólido |
| Tenant Management | Supporting | 8/10 ✅ | Anêmico — precisa crescer |
| Platform Administration | Supporting | 8/10 ✅ | Acoplamento aceitável (backoffice) |
| Patient | Core | 8/10 ✅ | Sólido, pequeno |
| Clinical Communication | Core | 7/10 ⚠️ | Carol deve ser desacoplado |
| Scheduling | Core | 9/10 ✅ | Muito bem modelado |
| Patient Journey | Core ⭐⭐ | 7/10 ⚠️ | Correto por design (Process Manager) |
| Infrastructure | Generic | N/A | Bem separado |

### Ações Recomendadas

| Prioridade | Ação |
|-----------|------|
| 🔴 Alta | Desacoplar Carol de Conversation — tornar detecção de intenção assíncrona via evento |
| 🔴 Alta | Criar interfaces de administração nos contextos core para PlatformAdmin consumir |
| 🟡 Média | Enriquecer TenantContext com lógica hoje dispersa em signup e platform-admin |
| 🟡 Média | Avaliar consolidação dos módulos finos de organizations e clinics |
| 🟢 Baixa | Adotar nomenclatura específica por contexto para o conceito `User` |
