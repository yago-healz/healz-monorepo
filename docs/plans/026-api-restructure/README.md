# Plano 026 — Reestruturação do apps/api para Organização Profissional

**Objetivo:** Reorganizar a estrutura de diretórios do `apps/api/src` em camadas claras (modules, common, infrastructure) sem alterar nenhuma implementação — tudo deve continuar funcionando identicamente.

---

## Contexto

### Problema atual

Todos os 16 módulos vivem flat sob `src/`, misturando:
- **Módulos de domínio** (patient, conversation, appointment, patient-journey)
- **Módulos de infraestrutura** (event-sourcing, audit, mail, messaging)
- **Módulos de identidade/acesso** (auth, signup, invites)
- **Módulos de gestão multi-tenant** (organizations, clinics, clinic-settings)
- **Módulo administrativo** (platform-admin)
- **Módulo de IA** (carol)
- **Database** (db/)

Guards, decorators e interceptors estão espalhados dentro de módulos específicos mas são usados globalmente.

### O que já está bom

- Módulos event-sourced (patient, conversation, appointment, patient-journey) já têm boa separação interna: `api/`, `application/`, `domain/`
- Módulos globais (AuditModule, EventSourcingModule, MailModule) já são `@Global()`
- Módulos de domínio são desacoplados entre si (comunicam via event bus)
- CarolModule e MessagingModule usam interfaces (string tokens) para abstração

### Princípios da refatoração

1. **Zero mudança de comportamento** — apenas mover arquivos e atualizar imports
2. **Agrupamento por bounded context** — módulos relacionados ficam próximos
3. **Separação clara** — infraestrutura vs domínio vs compartilhado
4. **Incremental** — cada task pode ser feita e testada independentemente

---

## Estrutura proposta

```
src/
├── main.ts
├── app.module.ts
│
├── common/                              # Compartilhado entre módulos
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # ← de auth/decorators/
│   │   └── roles.decorator.ts           # ← de auth/decorators/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            # ← de auth/guards/
│   │   ├── roles.guard.ts               # ← de auth/guards/
│   │   └── email-verified.guard.ts      # ← de auth/guards/
│   ├── interceptors/
│   │   └── audit.interceptor.ts         # ← de audit/
│   ├── interfaces/
│   │   └── jwt-payload.interface.ts     # ← de auth/interfaces/
│   ├── swagger/
│   │   └── swagger-schemas.ts           # ← de common/
│   └── dto/
│       ├── pagination-query.dto.ts      # ← de platform-admin/dto/common/
│       └── pagination-meta.dto.ts       # ← de platform-admin/dto/common/
│
├── infrastructure/                      # Infraestrutura cross-cutting
│   ├── database/
│   │   ├── database.module.ts           # (novo) encapsula config do DB
│   │   ├── index.ts                     # ← de db/
│   │   ├── schema/                      # ← de db/schema/
│   │   ├── migrations/                  # ← de db/migrations/
│   │   ├── seeds/                       # ← de db/seeds/
│   │   └── middleware/
│   │       └── rls.middleware.ts         # ← de db/middleware/
│   ├── event-sourcing/                  # ← de event-sourcing/ (inteiro)
│   │   ├── event-sourcing.module.ts
│   │   ├── domain/
│   │   ├── event-bus/
│   │   ├── event-store/
│   │   └── utils/
│   ├── audit/                           # ← de audit/ (module + service)
│   │   ├── audit.module.ts
│   │   └── audit.service.ts
│   └── mail/                            # ← de mail/ (inteiro)
│       ├── mail.module.ts
│       └── mail.service.ts
│
├── modules/                             # Módulos de domínio/feature
│   ├── auth/                            # ← de auth/ (sem guards/decorators/interfaces globais)
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   │
│   ├── signup/                          # ← de signup/ (inteiro)
│   │   ├── signup.module.ts
│   │   ├── signup.controller.ts
│   │   ├── signup.service.ts
│   │   └── dto/
│   │
│   ├── invites/                         # ← de invites/ (inteiro)
│   │   ├── invites.module.ts
│   │   ├── invites.controller.ts
│   │   ├── invites.service.ts
│   │   ├── dto/
│   │   └── guards/
│   │       └── is-org-admin.guard.ts
│   │
│   ├── organizations/                   # ← de organizations/ (inteiro)
│   │   ├── organizations.module.ts
│   │   ├── organizations.controller.ts
│   │   ├── organizations.service.ts
│   │   └── dto/
│   │
│   ├── clinics/                         # ← de clinics/ (inteiro)
│   │   ├── clinics.module.ts
│   │   ├── clinics.controller.ts
│   │   ├── clinics.service.ts
│   │   ├── dto/
│   │   └── guards/
│   │       └── is-clinic-admin.guard.ts
│   │
│   ├── clinic-settings/                 # ← de clinic-settings/ (inteiro)
│   │   ├── clinic-settings.module.ts
│   │   ├── clinic-settings.controller.ts
│   │   ├── clinic-settings.service.ts
│   │   └── dto/
│   │
│   ├── patient/                         # ← de patient/ (inteiro)
│   │   ├── patient.module.ts
│   │   ├── api/
│   │   ├── application/
│   │   └── domain/
│   │
│   ├── conversation/                    # ← de conversation/ (inteiro)
│   │   ├── conversation.module.ts
│   │   ├── api/
│   │   ├── application/
│   │   └── domain/
│   │
│   ├── appointment/                     # ← de appointment/ (inteiro)
│   │   ├── appointment.module.ts
│   │   ├── api/
│   │   ├── application/
│   │   └── domain/
│   │
│   ├── patient-journey/                 # ← de patient-journey/ (inteiro)
│   │   ├── patient-journey.module.ts
│   │   ├── api/
│   │   ├── application/
│   │   └── domain/
│   │
│   ├── messaging/                       # ← de messaging/ (inteiro)
│   │   ├── messaging.module.ts
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── test/
│   │
│   ├── carol/                           # ← de carol/ (inteiro)
│   │   ├── carol.module.ts
│   │   ├── domain/
│   │   └── infrastructure/
│   │
│   └── platform-admin/                  # ← de platform-admin/ (inteiro)
│       ├── platform-admin.module.ts
│       ├── controllers/
│       ├── services/
│       ├── dto/                         # (sem dto/common/, movido para common/dto/)
│       ├── guards/
│       └── utils/
│
├── health.controller.ts                 # mantém na raiz (não é módulo)
```

---

## Mapa de dependências entre módulos

```
                    ┌─────────────────────────────────────────┐
                    │         INFRASTRUCTURE (Global)          │
                    │  EventSourcingModule · AuditModule · Mail │
                    └────────────────┬────────────────────────┘
                                     │ disponível para todos
                    ┌────────────────┴────────────────────────┐
                    │              MODULES                     │
                    │                                          │
                    │  AuthModule ←── SignupModule              │
                    │       ↑         InvitesModule ──┐        │
                    │       │                         ↓        │
                    │  PlatformAdminModule ←── (AuditModule,   │
                    │                          MailModule,      │
                    │                          InvitesModule)   │
                    │                                          │
                    │  OrganizationsModule   ClinicsModule      │
                    │  ClinicSettingsModule                     │
                    │                                          │
                    │  PatientModule ·····→ EventBus ←····      │
                    │  ConversationModule ←── CarolModule       │
                    │  AppointmentModule ·····→ EventBus        │
                    │  PatientJourneyModule ···→ EventBus       │
                    │  MessagingModule                          │
                    └──────────────────────────────────────────┘
```

---

## Tasks

| # | Task | Arquivo | Descrição |
|---|------|---------|-----------|
| 01 | Criar estrutura de diretórios | [01-create-directories.md](./01-create-directories.md) | Criar pastas `common/`, `infrastructure/`, `modules/` |
| 02 | Mover common (guards, decorators, interceptors) | [02-move-common.md](./02-move-common.md) | Extrair itens compartilhados para `common/` |
| 03 | Mover infrastructure (db, event-sourcing, audit, mail) | [03-move-infrastructure.md](./03-move-infrastructure.md) | Mover módulos de infra para `infrastructure/` |
| 04 | Mover modules de domínio | [04-move-modules.md](./04-move-modules.md) | Mover todos os feature modules para `modules/` |
| 05 | Atualizar app.module.ts e imports | [05-update-app-module.md](./05-update-app-module.md) | Atualizar todos os import paths |
| 06 | Atualizar configurações (tsconfig, drizzle, jest) | [06-update-configs.md](./06-update-configs.md) | Ajustar paths em configs externas |
| 07 | Validar tudo funciona | [07-validate.md](./07-validate.md) | Compilar, rodar testes, verificar |

---

## Ordem de execução

```
1. [01-create-directories.md]  — criar estrutura vazia (1 min)
2. [02-move-common.md]         — precisa existir antes dos módulos que importam
3. [03-move-infrastructure.md] + [04-move-modules.md]  ← PARALELO (sem dependência mútua)
4. [05-update-app-module.md]   — depende de 02, 03, 04
5. [06-update-configs.md]      — depende de 03 (drizzle config aponta para db/)
6. [07-validate.md]            — depende de tudo anterior
```

---

## Fora do escopo

- **Renomear módulos** (ex: `clinics` → `tenant/clinics`) — pode ser feito depois
- **Criar barrel exports** (index.ts) em cada pasta — não é necessário agora
- **Refatorar implementação** — zero mudança de lógica
- **Mover testes** — `test/` na raiz fica onde está (paths de import serão atualizados)
- **Criar DatabaseModule** — listado como futuro, mas não necessário agora
- **Agrupar módulos em sub-bounded-contexts** (ex: `modules/tenant/{orgs,clinics}`) — pode ser feito incrementalmente depois
