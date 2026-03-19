# Implementation Notes - QUESTIONS.md Resolution

## Summary

Based on 63 questions from the codebase review audit and the project owner's answers, this document maps each decision to an implementation action. Work is grouped into 7 priority buckets, sequenced from highest risk (security) to lowest risk (cleanup). 28 items require action; 35 are deferred or require no change.

---

## Decision Mapping

### Legend

| Status | Meaning |
|--------|---------|
| `action` | Approved for implementation now |
| `deferred` | Known issue, will be addressed later |
| `no-change` | Intentional behavior, no action needed |
| `blocked` | Cannot proceed without more information |

### Q1 - Q9: Security Critical

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q1 | Controllers sem auth (Patient, Appointment, Conversation, PatientJourney) | Endpoints nao devem ser publicos | Add `@UseGuards(JwtAuthGuard)` to all 4 controllers | `action` |
| Q2 | RLS middleware le `req.session` (nunca populado) | RLS deve funcionar em producao | Fix middleware to read `req.user.organizationId` from JWT payload | `action` |
| Q3 | Debug endpoint `/debug/timezone-test` | Remover | Delete the endpoint | `action` |
| Q4 | Test messaging controller sem auth | Adicionar guards admin | Add auth guards + environment restriction | `action` |
| Q5 | JWT_SECRET ausente no .env.example | Adicionar | Add to `.env.example` | `action` |
| Q6 | OPENAI_API_KEY e CLINIC_TIMEZONE ausentes | Adicionar | Add to `.env.example` | `action` |
| Q7 | SSL `rejectUnauthorized: false` | Apenas em dev | Conditionally set based on NODE_ENV | `action` |
| Q8 | OAuth callback sem state validation | Nao sei responder | Skip for now | `blocked` |
| Q9 | CORS single origin | Intencional | None | `no-change` |

### Q10 - Q16: Architecture & Code Structure

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q10 | Duplicate `generateRefreshToken` (3 services) | Token service centralizado | Extract to shared `TokenService` | `action` |
| Q11 | Dynamic imports in auth.service | Refatorar para imports estaticos | Convert to static imports | `action` |
| Q12 | Login N+1 queries | Otimizar | Rewrite as single JOIN query | `action` |
| Q13 | CQRS parcial vs CRUD | Dois mundos, mais organizados | Architecture documentation only (deferred structural changes) | `deferred` |
| Q14 | `users: any` no schema | Deveria ser tipado | Fix type annotation, remove `any` | `action` |
| Q15 | Carol sessions em memoria | Permanecera assim por hora | None | `deferred` |
| Q16 | DB connection pool singleton | Ha planos | None | `deferred` |

### Q17 - Q19: Multi-tenancy & Data Isolation

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q17 | Controllers sem filtro tenant/clinic | Depende do RLS | Resolved by Q2 fix | `action` (via Q2) |
| Q18 | `createClinic` sem verificacao admin | Deveria ter guard | Add `IsOrgAdminGuard` or equivalent check | `action` |
| Q19 | Event store sem isolamento tenant | Deveria ter, mas nao sei detalhes | Needs investigation before implementation | `blocked` |

### Q20 - Q22: API Design

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q20 | Sem paginacao nos endpoints de dominio | Deixar como esta | None | `deferred` |
| Q21 | Inconsistencia formato resposta | Deve haver padrao claro | Define and apply standard response envelope | `action` |
| Q22 | `complete` endpoint sem DTO tipado | Deve ter DTO tipado | Create `CompleteAppointmentDto` with validation | `action` |

### Q23 - Q26: Data & Persistence

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q23 | refresh_tokens.family formato inconsistente | Padronizar | Standardize to `randomUUID()` across all services (ties into Q10 TokenService) | `action` |
| Q24 | `updatedAt` nunca atualizado | Automatico via Drizzle | Add `.$onUpdate(() => new Date())` or equivalent | `action` |
| Q25 | JSONB sem validacao de schema | Deveria ter validacao | Add Zod/class-validator schemas for JSONB columns | `action` |
| Q26 | Projections sem foreign keys | Nao faremos nada | None | `deferred` |

### Q27 - Q30: Error Handling & Resilience

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q27 | RLS middleware fail-open | Request deve falhar | Change to return 500 on RLS setup failure | `action` |
| Q28 | Carol tool-calling loop sem limite | Limite basico | Add max iterations (e.g. 10) to the while loop | `action` |
| Q29 | Emails fire-and-forget | Nao faremos nada | None | `deferred` |
| Q30 | RabbitMQ sem DLQ consumer | Nao faremos nada | None | `deferred` |

### Q31 - Q33: Performance

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q31 | Carol instancia ChatOpenAI por request | Reutilizar | Create instance once in constructor or as class property | `action` |
| Q32 | IsClinicAdminGuard 2 queries | Otimizar na camada app (sem Redis) | Merge into single JOIN query | `action` |
| Q33 | EmailVerifiedGuard query ao banco | Incluir no JWT | Add `emailVerified` to JWT payload, read from token | `action` |

### Q34 - Q37: Testing & Observability

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q34 | Cobertura de testes baixa | Deixar como esta | None | `deferred` |
| Q35 | Testes E2E incompletos | Deixar como esta | None | `deferred` |
| Q36 | console.log em vez de Logger | Usar Logger do NestJS | Migrate 86 occurrences across 23 files | `action` |
| Q37 | Audit interceptor | Deixar como esta | None | `no-change` |

### Q38 - Q43: Technical Debt

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q38 | TODO reset password platform-admin | Deixar como esta | None | `deferred` |
| Q39 | TODO conversation aggregate | Deixar como esta | None | `deferred` |
| Q40 | `better-auth` unused | Remover | `pnpm remove better-auth` | `action` |
| Q41 | Dois drivers PostgreSQL | Usar um so | Remove `postgres` package, keep `pg` | `action` |
| Q42 | CLINIC_TIMEZONE env var global | clinic_settings, default UTC-3 | Add timezone column to clinic_settings, default `America/Sao_Paulo` | `action` |
| Q43 | users: any cascade | Deveria ser tipado | Same fix as Q14 | `action` (via Q14) |

### Q44 - Q50: Missing Decisions / Open Gaps

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q44 | Sem cleanup refresh tokens | Deixar como esta | None | `deferred` |
| Q45 | RolesGuard definido mas nunca usado | Remover | Delete file and references | `action` |
| Q46 | EmailVerifiedGuard nunca usado | Aplicar globalmente | Register as global guard in `app.module.ts` | `action` |
| Q47 | Sem replay de eventos | Ha planos | None | `deferred` |
| Q48 | Sem health checks profundos | Ha planos | None | `deferred` |
| Q49 | Swagger exposto em producao | Nao fazer nada | None | `deferred` |
| Q50 | Rate limiting por IP apenas | Sim (per-user) | Add user-based throttling alongside IP-based | `action` |

### Q51 - Q63: Security Additional (Deep Audit)

| Q# | Topic | Decision | Action | Status |
|----|-------|----------|--------|--------|
| Q51 | `Math.random()` para senhas | Refatorar | Replace with `crypto.randomBytes()` | `action` |
| Q52 | Senha temporaria na resposta API | Ajustar | Send password only via email, not in response | `action` |
| Q53 | CreateAppointmentTool mock data | Nao fazer nada | None | `deferred` |
| Q54 | Logica conflito horario invertida | Nao fazer nada | None | `deferred` |
| Q55 | Race condition agendamento | Sim | Add advisory lock or DB constraint for doctor+timeslot | `action` |
| Q56 | Projection handlers sem idempotencia | Sera implementado, sem prazo | None | `deferred` |
| Q57 | DLQ sem consumidor | Nao fazer nada | None | `deferred` |
| Q58 | user_clinic_roles sem unique constraint | Sim | Add unique index on `(userId, clinicId)` + migration | `action` |
| Q59 | Event store inserts sequenciais | Nao fazer nada | None | `deferred` |
| Q60 | Sem account lockout | Nao fazer nada | None | `deferred` |
| Q61 | Validacao horarios agenda ausente | Sim | Add validation rules to scheduling DTOs | `action` |
| Q62 | Logica de negocios no Process Manager | Sim | Move milestone/cancellation logic to PatientJourney aggregate | `action` |
| Q63 | clinic_id default empty string | Sim | Throw error if `clinic_id` is missing | `action` |

---

## Implementation Plan

### Sequencing Strategy

Work is ordered by: (1) security risk, (2) data integrity, (3) correctness, (4) performance, (5) improvements, (6) cleanup. Within each bucket, independent tasks can be parallelized.

---

### Bucket 1: Security - Critical

**Priority: HIGHEST | Risk: High if not addressed | Estimated scope: Medium-Large**

These changes protect sensitive data and fix authentication/authorization gaps.

#### 1.1 Add auth guards to domain controllers (Q1)

**Files:**
- `src/modules/patient/api/patient.controller.ts`
- `src/modules/appointment/api/appointment.controller.ts`
- `src/modules/conversation/api/conversation.controller.ts`
- `src/modules/patient-journey/api/patient-journey.controller.ts`

**Changes:** Add `@UseGuards(JwtAuthGuard)` at controller class level.

#### 1.2 Fix RLS middleware (Q2, Q17, Q27)

**Files:**
- `src/infrastructure/database/middleware/rls.middleware.ts`

**Changes:**
- Read `organizationId` from `req.user` (JWT payload) instead of `req.session`
- On failure: return 500 response instead of calling `next()` (Q27)
- Ensure middleware runs after JWT auth guard populates `req.user`

#### 1.3 Remove debug endpoint (Q3)

**Files:**
- `src/modules/google-calendar/google-calendar.controller.ts` (lines 101-109)

**Changes:** Delete the `/debug/timezone-test` route handler.

#### 1.4 Protect test messaging controller (Q4)

**Files:**
- `src/modules/messaging/test/test-messaging.controller.ts`

**Changes:** Add admin auth guard. Consider also restricting to non-production via environment check.

#### 1.5 Fix SSL configuration (Q7)

**Files:**
- `src/infrastructure/database/index.ts`

**Changes:** Set `rejectUnauthorized: true` when `NODE_ENV === 'production'`, keep `false` only for development.

#### 1.6 Add org admin guard to createClinic (Q18)

**Files:**
- `src/modules/organizations/organizations.controller.ts` (lines 80-92)

**Changes:** Add authorization check that user is admin of the target organization.

#### 1.7 Fix Math.random for password generation (Q51)

**Files:**
- `src/modules/platform-admin/services/platform-admin-users.service.ts`

**Changes:** Replace `Math.random()` with `crypto.randomBytes()` or `crypto.getRandomValues()`.

#### 1.8 Remove temp password from API response (Q52)

**Files:**
- `src/modules/platform-admin/services/platform-admin-users.service.ts` (lines 473-496)

**Changes:** Send password only via email. API response should confirm action without exposing the password.

---

### Bucket 2: Security - Important

**Priority: HIGH | Risk: Medium**

#### 2.1 Apply EmailVerifiedGuard globally (Q46)

**Files:**
- `src/app.module.ts`
- `src/common/guards/email-verified.guard.ts`

**Changes:** Register as `APP_GUARD` in `app.module.ts`. Ensure public routes (login, signup, verify-email, refresh) are excluded via decorator or route metadata.

**Note:** This interacts with Q33 (moving emailVerified to JWT). If Q33 is done first, the guard reads from JWT instead of DB, which is more performant. Consider implementing Q33 before this.

#### 2.2 Add user-based rate limiting (Q50)

**Files:**
- `src/app.module.ts` (ThrottlerGuard config)

**Changes:** Add throttling keyed by `userId` (from JWT) in addition to IP-based. Adjust limits to be meaningful in dev too.

---

### Bucket 3: Data Integrity & Bug Fixes

**Priority: HIGH | Risk: Medium**

#### 3.1 Fix `users` schema typing (Q14, Q43)

**Files:**
- `src/infrastructure/database/schema/auth.schema.ts` (line 35)

**Changes:** Remove `: any` annotation. Use Drizzle's self-referencing pattern (e.g., separate the reference or use `$inferSelect`).

#### 3.2 Add unique constraint to user_clinic_roles (Q58)

**Files:**
- `src/infrastructure/database/schema/auth.schema.ts` (lines 55-65)
- New migration file

**Changes:** Add unique index on `(userId, clinicId)`. Generate and apply Drizzle migration.

#### 3.3 Auto-update updatedAt columns (Q24)

**Files:**
- All schema files with `updatedAt` columns

**Changes:** Add `.$onUpdate(() => new Date())` to `updatedAt` columns in Drizzle schema, or add a PostgreSQL trigger. Drizzle's `.$onUpdate` is preferred per the user's answer.

#### 3.4 Fix clinic_id empty string fallback (Q63)

**Files:**
- `src/modules/patient-journey/application/process-managers/patient-journey.process-manager.ts` (line 56)

**Changes:** Replace `event.clinic_id ?? ""` with an error throw if `clinic_id` is missing.

#### 3.5 Add Carol tool-calling loop limit (Q28)

**Files:**
- `src/modules/carol/chat/carol-chat.service.ts` (lines 97-160)

**Changes:** Add a counter with max iterations (e.g., 10). When exceeded, return a graceful message to the user.

#### 3.6 Add advisory lock for appointment creation (Q55)

**Files:**
- `src/modules/appointment/application/appointment.service.ts` (lines 20-69)

**Changes:** Use PostgreSQL advisory lock keyed on `(doctorId, timeSlot)` or add a unique partial constraint to prevent concurrent double-booking.

---

### Bucket 4: Refactoring

**Priority: MEDIUM | Risk: Medium (behavioral changes)**

#### 4.1 Extract centralized TokenService (Q10, Q23)

**Files:**
- New: `src/modules/auth/token.service.ts` (or `src/common/services/token.service.ts`)
- Modify: `src/modules/auth/auth.service.ts`
- Modify: `src/modules/signup/signup.service.ts`
- Modify: `src/modules/invites/invites.service.ts`

**Changes:**
- Extract `generateRefreshToken` to a shared `TokenService`
- Standardize `family` generation to use `randomUUID()` everywhere (Q23)
- Inject `TokenService` in Auth, Signup, and Invites modules

#### 4.2 Convert dynamic imports to static (Q11)

**Files:**
- `src/modules/auth/auth.service.ts` (lines 77-78, 109, 318)

**Changes:** Move `import("../../infrastructure/database/schema")` to top-level static imports. If circular dependency exists, resolve it.

#### 4.3 Move business logic from Process Manager to Aggregate (Q62)

**Files:**
- `src/modules/patient-journey/application/process-managers/patient-journey.process-manager.ts` (lines 94-119)
- `src/modules/patient-journey/domain/patient-journey.aggregate.ts`

**Changes:** Move milestone detection and cancellation threshold logic (>=2) into the PatientJourney aggregate. Process Manager should only orchestrate.

---

### Bucket 5: Performance

**Priority: MEDIUM | Risk: Low-Medium**

#### 5.1 Optimize login N+1 queries (Q12)

**Files:**
- `src/modules/auth/auth.service.ts` (lines 111-129)

**Changes:** Replace N+1 clinic activity checks with a single JOIN query.

#### 5.2 Reuse ChatOpenAI instance (Q31)

**Files:**
- `src/modules/carol/chat/carol-chat.service.ts` (lines 63-67)

**Changes:** Create `ChatOpenAI` instance once (in constructor or as lazy singleton property) instead of per request.

#### 5.3 Optimize IsClinicAdminGuard to single query (Q32)

**Files:**
- `src/modules/clinics/guards/is-clinic-admin.guard.ts` (lines 20-53)

**Changes:** Merge the two queries (fetch clinic + check role) into a single JOIN query.

#### 5.4 Include emailVerified in JWT payload (Q33)

**Files:**
- JWT generation logic (auth.service, signup.service, invites.service — or the new TokenService from 4.1)
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/common/guards/email-verified.guard.ts`

**Changes:** Add `emailVerified` boolean to JWT payload. Update guard to read from `req.user.emailVerified` instead of querying DB.

**Note:** Implement this BEFORE Bucket 2.1 (global EmailVerifiedGuard) for best performance.

---

### Bucket 6: Improvements

**Priority: LOW-MEDIUM | Risk: Low**

#### 6.1 Add missing env vars to .env.example (Q5, Q6)

**Files:**
- `apps/api/.env.example`

**Changes:** Add `JWT_SECRET`, `OPENAI_API_KEY`, `CLINIC_TIMEZONE` with example values and comments.

#### 6.2 Standardize API response format (Q21)

**Scope:** Define a standard envelope (e.g., `{ data, message?, meta? }`) and apply to existing controllers. This is potentially large — consider defining the standard first and applying incrementally.

#### 6.3 Create CompleteAppointmentDto (Q22)

**Files:**
- New: `src/modules/appointment/dto/complete-appointment.dto.ts`
- Modify: `src/modules/appointment/api/appointment.controller.ts` (line 99)

**Changes:** Create DTO with `@IsOptional() @IsString() notes?: string` and use it in the controller.

#### 6.4 Add JSONB schema validation (Q25)

**Files:**
- `src/modules/clinic-settings/dto/clinic-scheduling.dto.ts`

**Changes:** Add class-validator decorators for `weeklySchedule`, `specificBlocks`, and other JSONB structures.

#### 6.5 Migrate console.log to NestJS Logger (Q36)

**Files:** 23 files with 86 occurrences

**Changes:** Replace `console.log/error/warn` with NestJS `Logger` instance. Add `private readonly logger = new Logger(ClassName.name)` to each class.

#### 6.6 Move CLINIC_TIMEZONE to clinic_settings (Q42)

**Files:**
- `src/infrastructure/database/schema/clinic-settings.schema.ts`
- `src/modules/carol/tools/check-availability.tool.ts`
- `src/modules/carol/chat/carol-chat.service.ts`
- `src/modules/google-calendar/google-calendar.service.ts`
- New migration file

**Changes:**
- Add `timezone` column to `clinic_settings` (default `America/Sao_Paulo`)
- Read timezone from clinic settings instead of `process.env.CLINIC_TIMEZONE`
- Keep env var as ultimate fallback

#### 6.7 Add schedule time validation in DTOs (Q61)

**Files:**
- `src/modules/clinic-settings/dto/clinic-scheduling.dto.ts`

**Changes:** Add validation: HH:MM format, `from < to`, no overlapping blocks.

---

### Bucket 7: Cleanup

**Priority: LOW | Risk: Very Low**

#### 7.1 Remove `better-auth` package (Q40)

```bash
cd apps/api && pnpm remove better-auth
```

#### 7.2 Remove unused `postgres` package (Q41)

```bash
cd apps/api && pnpm remove postgres
```

#### 7.3 Remove unused RolesGuard (Q45)

**Files:**
- Delete: `src/common/guards/roles.guard.ts`
- Delete: associated `@Roles()` decorator if exists
- Remove any imports/references

---

## Deferred Items

| Q# | Topic | Reason |
|----|-------|--------|
| Q13 | CQRS vs CRUD organization | Architecture decision, needs separate planning |
| Q15 | Carol sessions in memory | Acceptable for MVP |
| Q16 | DB pool as DI provider | Has plans, not urgent |
| Q20 | Pagination on domain endpoints | Acceptable for current scale |
| Q26 | Projection tables no FKs | Intentional for event sourcing |
| Q29 | Email fire-and-forget | Acceptable risk |
| Q30 | RabbitMQ DLQ handling | Acceptable risk |
| Q34 | Low test coverage | Known, no immediate plan |
| Q35 | E2E tests incomplete | Known, no immediate plan |
| Q38 | TODO: platform-admin reset | Incomplete feature, deferred |
| Q39 | TODO: conversation aggregate integration | Deferred |
| Q44 | No refresh token cleanup cron | Known tech debt |
| Q47 | No event replay mechanism | Has plans |
| Q48 | No deep health checks | Has plans |
| Q49 | Swagger in production | Acceptable |
| Q53 | Carol CreateAppointmentTool mock | Known limitation |
| Q54 | Conflict detection logic possibly inverted | Owner chose not to fix now |
| Q56 | Projection handlers not idempotent | Will be implemented, no deadline |
| Q57 | DLQ has no consumer | Acceptable risk |
| Q59 | Event store sequential inserts | Acceptable performance |
| Q60 | No account lockout | Acceptable risk |

## Blocked Items

| Q# | Topic | Reason |
|----|-------|--------|
| Q8 | OAuth state/CSRF validation | Owner unsure of current behavior; needs investigation |
| Q19 | Event store tenant isolation | Owner wants isolation but unclear on implementation; needs deep investigation |

---

## Recommended Implementation Order

```
Phase 1 - Security Critical (Bucket 1)
  Can be parallelized:
    [1.1] Auth guards on controllers
    [1.3] Remove debug endpoint
    [1.4] Protect test controller
    [1.5] Fix SSL config
    [1.7] Fix Math.random
    [1.8] Remove password from response
  Sequential (depends on understanding auth flow):
    [1.2] Fix RLS middleware (+ Q27 fail-close)
    [1.6] Org admin guard

Phase 2 - Data Integrity (Bucket 3)
  Can be parallelized:
    [3.1] Fix users:any typing
    [3.2] Unique constraint user_clinic_roles
    [3.3] Auto-update updatedAt
    [3.4] Fix clinic_id empty string
    [3.5] Carol loop limit
  Sequential:
    [3.6] Advisory lock for appointments (needs careful design)

Phase 3 - Refactoring (Bucket 4)
  Sequential (dependencies):
    [4.2] Fix dynamic imports first
    [4.1] Extract TokenService (includes Q23 standardization)
    [4.3] Move logic from Process Manager to Aggregate

Phase 4 - Performance (Bucket 5)
  Can be parallelized:
    [5.1] Optimize login N+1
    [5.2] Reuse ChatOpenAI
    [5.3] Optimize IsClinicAdminGuard
  Then:
    [5.4] emailVerified in JWT

Phase 5 - Security Important (Bucket 2)
  Sequential (depends on Phase 4 - 5.4):
    [2.1] Apply EmailVerifiedGuard globally
    [2.2] User-based rate limiting

Phase 6 - Improvements (Bucket 6)
  Can be parallelized:
    [6.1] .env.example updates
    [6.3] CompleteAppointmentDto
    [6.4] JSONB validation
    [6.7] Schedule time validation
  Larger scope (separate PRs):
    [6.2] Standardize response format
    [6.5] Migrate console.log to Logger (23 files)
    [6.6] CLINIC_TIMEZONE to clinic_settings

Phase 7 - Cleanup (Bucket 7)
  Can be parallelized:
    [7.1] Remove better-auth
    [7.2] Remove postgres package
    [7.3] Remove RolesGuard
```

---

## Notes

- **Q14 and Q43 are the same issue** (users schema typed as `any`). Single fix resolves both.
- **Q17 is resolved by Q2** (RLS fix provides tenant filtering).
- **Q10 and Q23 are related** — TokenService centralizes logic AND standardizes family format.
- **Q33 should be done before Q46** — adding emailVerified to JWT makes the global guard performant.
- **Q55 (race condition)** is the most complex single item. Consider a spike/investigation before committing to advisory locks vs. unique constraints.
- **Migrations needed:** Q3.2 (unique constraint), Q3.3 (updatedAt), Q6.6 (timezone column). Bundle where possible.
