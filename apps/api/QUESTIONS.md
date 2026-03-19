# QUESTIONS.md - Healz API Codebase Review

## Project Understanding Summary

Healz is a multi-tenant healthcare management SaaS platform (B2B) built with NestJS + Drizzle ORM + PostgreSQL. The system manages organizations, clinics, users (with role-based access), patients, appointments, conversations (messaging), and an AI assistant ("Carol") powered by OpenAI/LangChain.

**Architecture highlights:**

- Multi-tenant via organizations -> clinics -> users hierarchy
- Event sourcing for core domain aggregates (Patient, Appointment, Conversation, PatientJourney)
- CQRS-like pattern with aggregates, projections/views, and event handlers
- RabbitMQ event bus for async event processing
- Google Calendar integration for appointment availability
- AI chatbot (Carol) with tool-calling capabilities

**High-risk areas identified:**

- Authentication/authorization gaps on several controllers
- RLS middleware appears non-functional (reads `req.session` which is never populated)
- Test endpoints exposed without environment guards
- In-memory session storage for Carol AI
- Multiple `process.env` reads outside ConfigModule
- Significant `console.log` usage in production code
- Duplicate refresh token generation logic across 3 services

---

## How to Answer

For each question, provide a direct answer and mark the item as one of:

- `verified` - Confirmed as intended behavior, no changes needed
- `partial` - Partially addressed, needs further work
- `blocked` - Cannot be addressed now due to external dependency
- `deferred` - Known issue, will be addressed later
- `out-of-scope` - Not relevant to current goals
- `caveat` - Intended but with known trade-offs

---

## Questions

---

### 1. Security - Critical

#### Q1. Controllers sem autenticacao: Patient, Appointment, Conversation, PatientJourney

- **Where:** `src/modules/patient/api/patient.controller.ts`, `src/modules/appointment/api/appointment.controller.ts`, `src/modules/conversation/api/conversation.controller.ts`, `src/modules/patient-journey/api/patient-journey.controller.ts`
- **Why this matters:** Estes controllers expoe dados sensiveis de pacientes (PII, historico medico, agendamentos) sem nenhum `@UseGuards`. Qualquer pessoa com acesso ao endpoint pode criar, ler e atualizar dados de pacientes, agendamentos e conversas de qualquer tenant. Isso e uma violacao grave de seguranca e privacidade (LGPD/HIPAA).
- **Question:** Estes endpoints sao intencionalmente publicos (ex: para uso interno entre servicos)? Se nao, quais guards devem ser aplicados e qual o nivel de permissao necessario para cada operacao?

#### Q2. RLS Middleware inoperante - `req.session` nunca e populado

- **Where:** `src/infrastructure/database/middleware/rls.middleware.ts:17-20`
- **Why this matters:** O middleware RLS le `(req as any).session.activeOrganizationId`, mas a API usa autenticacao JWT (nao express-session). O `req.session` nunca e populado por nenhum guard ou middleware. Isso significa que a RLS provavelmente **nunca e ativada**, e o isolamento multi-tenant a nivel de banco de dados nao funciona. Mesmo se existirem policies de RLS no PostgreSQL, o `set_config('app.current_org_id', ...)` nunca e chamado com um valor real.
- **Question:** O RLS esta efetivamente desabilitado em producao? Deveria estar lendo de `req.user.organizationId` (do JWT payload) em vez de `req.session`? Ha policies de RLS realmente configuradas no PostgreSQL, ou o middleware foi implementado mas as policies nao?

#### Q3. Debug endpoint exposto sem restricao de ambiente

- **Where:** `src/modules/google-calendar/google-calendar.controller.ts:101-109`
- **Why this matters:** O endpoint `GET /debug/timezone-test` esta acessivel sem autenticacao e sem verificacao de `NODE_ENV`. Em producao, isso pode expor informacoes internas sobre a configuracao do Google Calendar.
- **Question:** Este endpoint debug deve ser removido ou protegido por um guard de ambiente (ex: apenas em development)?

#### Q4. Test controller exposto sem restricao de ambiente

- **Where:** `src/modules/messaging/test/test-messaging.controller.ts`
- **Why this matters:** O controller `test/messaging` com endpoints `simulate-message`, `send-test-message`, `history`, e `clear` esta disponivel sem autenticacao e sem restricao de ambiente. Em producao, qualquer pessoa poderia simular mensagens ou enviar mensagens de teste.
- **Question:** Este controller deve ser registrado apenas em ambiente de desenvolvimento? Ou deve ter guards de autenticacao/admin?

#### Q5. JWT_SECRET nao esta no .env.example

- **Where:** `apps/api/.env.example`, `src/modules/auth/auth.module.ts:12`, `src/modules/signup/signup.module.ts:9`
- **Why this matters:** `JWT_SECRET` e critico para seguranca, mas nao aparece no `.env.example`. Devs novos podem esquecer de configura-lo, e o sistema nao valida sua existencia no startup (exceto no jwt.strategy.ts). Os modules de auth, signup e invites usam `process.env.JWT_SECRET` diretamente sem fallback seguro.
- **Question:** `JWT_SECRET` deve ser adicionado ao `.env.example`? Deveria haver uma validacao global no bootstrap que falhe se variaveis criticas nao estiverem definidas?

#### Q6. OPENAI_API_KEY e CLINIC_TIMEZONE ausentes no .env.example

- **Where:** `src/modules/carol/chat/carol-chat.service.ts:64-66`, `src/modules/carol/tools/check-availability.tool.ts:8`
- **Why this matters:** `OPENAI_API_KEY` e necessaria para Carol funcionar e `CLINIC_TIMEZONE` afeta a logica de agendamento. Nenhuma esta documentada no `.env.example`. `CLINIC_TIMEZONE` tem fallback para `America/Sao_Paulo`, mas isso pode ser errado para clinicas em outros fusos.
- **Question:** Estas variaveis devem ser documentadas no `.env.example`? O `CLINIC_TIMEZONE` deveria ser uma configuracao por clinica em vez de uma env var global?

#### Q7. SSL com `rejectUnauthorized: false`

- **Where:** `src/infrastructure/database/index.ts:9`
- **Why this matters:** Quando `DATABASE_SSL=true`, a conexao SSL e feita com `rejectUnauthorized: false`, o que desabilita a verificacao de certificados e torna a conexao vulneravel a ataques man-in-the-middle.
- **Question:** E aceitavel em producao? Deveria ser `rejectUnauthorized: true` com CA certificate configurado?

#### Q8. Google Calendar OAuth callback sem validacao de state

- **Where:** `src/modules/google-calendar/google-calendar.controller.ts:46-63`
- **Why this matters:** O callback OAuth recebe `code` e `state` como query params, mas nao valida `state` contra um CSRF token previamente armazenado. Isso pode permitir ataques CSRF no fluxo OAuth.
- **Question:** O `state` parameter e validado contra um valor esperado no `handleOAuthCallback`? Ou o clinicId e simplesmente passado como state sem CSRF protection?

#### Q9. CORS com origin unico

- **Where:** `src/main.ts:24-29`
- **Why this matters:** CORS esta configurado com um unico origin (`FRONTEND_URL` ou `localhost:3000`). Se houver multiplos frontends (ex: admin panel separado, mobile web), eles nao conseguirao fazer requests.
- **Question:** E intencional ter um unico origin? Ha planos para multiplos frontends?

---

### 2. Architecture & Code Structure

#### Q10. Duplicacao de `generateRefreshToken` em 3 servicos

- **Where:** `src/modules/auth/auth.service.ts:362-380`, `src/modules/signup/signup.service.ts:199-214`, `src/modules/invites/invites.service.ts:378-395`
- **Why this matters:** A logica de geracao de refresh tokens esta duplicada em `AuthService`, `SignupService` e `InvitesService`. As implementacoes sao ligeiramente diferentes (uma aceita `family` como param, as outras geram novo). Mudancas na logica de tokens precisam ser feitas em 3 lugares.
- **Question:** Esta duplicacao e intencional, ou deveria haver um `TokenService` centralizado? Ha alguma razao para as implementacoes diferirem?

#### Q11. Import dinamico de schemas no auth.service

- **Where:** `src/modules/auth/auth.service.ts:77-78`, `src/modules/auth/auth.service.ts:109`, `src/modules/auth/auth.service.ts:318`
- **Why this matters:** O `AuthService` usa `await import("../../infrastructure/database/schema")` para importar `platformAdmins` e `organizations` em tempo de execucao em vez de no topo do arquivo. Isso sugere um problema de dependencia circular ou uma evolucao incremental nao refatorada.
- **Question:** Ha dependencias circulares que forcam esses imports dinamicos? Isso deveria ser refatorado para imports estaticos normais?

#### Q12. Login faz N+1 queries para verificar clinicas ativas

- **Where:** `src/modules/auth/auth.service.ts:111-129`
- **Why this matters:** O login busca todas as clinicas do usuario e depois, para cada clinica, faz uma query individual para verificar se clinic + organization estao ativas. Isso e um N+1 classico que pode ser resolvido com um unico JOIN.
- **Question:** Isso e intencional para simplicidade, ou deveria ser otimizado? Quantas clinicas um usuario tipicamente tem?

#### Q13. Inconsistencia arquitetural: CQRS parcial vs CRUD

- **Where:** `src/modules/patient/`, `src/modules/appointment/`, `src/modules/conversation/` vs `src/modules/clinics/`, `src/modules/procedures/`, `src/modules/doctor/`
- **Why this matters:** Modulos core (patient, appointment, conversation, patient-journey) usam event sourcing com aggregates, commands, event handlers e projections. Modulos de suporte (clinics, procedures, doctor, payment-methods) usam CRUD direto. Isso cria dois "mundos" diferentes na codebase com padroes divergentes.
- **Question:** A intencao e migrar todos os modulos para event sourcing eventualmente? Ou o CRUD e o padrao intencional para modulos que nao precisam de auditoria granular?

#### Q14. `users: any` no schema

- **Where:** `src/infrastructure/database/schema/auth.schema.ts:35`
- **Why this matters:** A tabela `users` esta tipada como `any` (`export const users: any = pgTable(...)`). Isso perde toda a type-safety do Drizzle para queries envolvendo users, que e a tabela mais usada do sistema.
- **Question:** Isso foi feito para resolver um erro de tipo circular (self-reference em `deactivatedBy`)? Existe uma solucao melhor que preserve type-safety?

#### Q15. Carol sessions em memoria

- **Where:** `src/modules/carol/chat/carol-chat.service.ts:22`
- **Why this matters:** O historico de conversas da Carol e armazenado em um `Map` em memoria (`private sessions = new Map<string, BaseMessage[]>()`). Isso significa: (1) perde-se todo historico ao reiniciar o servidor, (2) nao funciona com multiplas instancias/replicas, (3) pode causar memory leak com uso prolongado (sessions nunca sao removidas).
- **Question:** O comentario diz "OK for Playground MVP". Quando e o plano para migrar para persistencia (Redis/DB)? Ha um TTL planejado para sessions?

#### Q16. Database connection pool como singleton global

- **Where:** `src/infrastructure/database/index.ts`
- **Why this matters:** O pool de conexoes e criado no top-level do modulo como `export const db = drizzle(pool, { schema })`. Isso funciona mas: (1) nao participa do lifecycle do NestJS (nao fecha conexoes no shutdown), (2) torna dificil usar connection pools diferentes por contexto (ex: para transacoes com RLS), (3) dificulta testes (nao e injetavel/mockavel via DI).
- **Question:** Ha planos para integrar o pool com o DI container do NestJS? Isso dificultaria testes ou migracao futura?

---

### 3. Multi-tenancy & Data Isolation

#### Q17. Controllers de dominio nao filtram por tenant/clinic

- **Where:** `src/modules/patient/api/patient.controller.ts:40`, `src/modules/appointment/api/appointment.controller.ts:52-69`, `src/modules/conversation/api/conversation.controller.ts:62-73`
- **Why this matters:** Os controllers de Patient, Appointment e Conversation nao exigem `tenantId` ou `clinicId` obrigatoriamente nas queries de listagem. Sem RLS funcionando (veja Q2) e sem guards (veja Q1), qualquer usuario pode listar todos os pacientes/agendamentos/conversas do sistema inteiro.
- **Question:** Estes controllers dependem do RLS para isolamento (que esta quebrado)? Ou devem ter filtros de tenant/clinic obrigatorios no controller?

#### Q18. `organizations.createClinic` nao verifica se usuario e admin da org

- **Where:** `src/modules/organizations/organizations.controller.ts:80-92`, `src/modules/organizations/organizations.service.ts`
- **Why this matters:** O endpoint `POST /organizations/:organizationId/clinics` usa apenas `JwtAuthGuard` mas nao verifica se o usuario autenticado e admin da organizacao. Qualquer usuario autenticado pode criar clinicas em qualquer organizacao.
- **Question:** Falta um guard de autorizacao (ex: `IsOrgAdminGuard`) neste endpoint? O Swagger docs menciona "Requer permissao de admin da organizacao" mas o codigo nao verifica.

#### Q19. Event store sem isolamento por tenant

- **Where:** `src/infrastructure/database/schema/events.schema.ts`
- **Why this matters:** A tabela `events` tem colunas `tenantId` e `clinicId`, mas os queries no event store (`loadEvents`, `saveEvents`) podem nao estar filtrando por tenant consistentemente. Se o event bus publica eventos para todos os handlers, um handler de um tenant pode processar eventos de outro.
- **Question:** Os event handlers filtram por tenant? O event bus garante isolamento multi-tenant na publicacao de eventos?

---

### 4. API Design

#### Q20. Ausencia de paginacao nos endpoints de listagem do dominio

- **Where:** `src/modules/patient/api/patient.controller.ts:39-44`, `src/modules/appointment/api/appointment.controller.ts:52-69`, `src/modules/conversation/api/conversation.controller.ts:62-73`, `src/modules/patient-journey/api/patient-journey.controller.ts:25-43`
- **Why this matters:** Os endpoints de listagem de patients, appointments, conversations e journeys nao tem paginacao. Para clinicas com muitos registros, isso pode causar problemas de performance e timeouts.
- **Question:** Paginacao sera adicionada a estes endpoints? Os endpoints de platform-admin ja usam paginacao (via `use-pagination` hook no frontend).

#### Q21. Inconsistencia no formato de resposta

- **Where:** Diversos controllers
- **Why this matters:** Alguns endpoints retornam `{ success: true }` (patient.controller), outros retornam `{ message: "..." }` (appointment.controller), e outros retornam os dados diretamente. Nao ha um envelope de resposta padronizado.
- **Question:** Deve haver um formato de resposta padrao (ex: `{ data, meta, message }`)? Ou a inconsistencia e aceitavel para o momento?

#### Q22. `complete` endpoint aceita body sem DTO tipado

- **Where:** `src/modules/appointment/api/appointment.controller.ts:99`
- **Why this matters:** O endpoint `PATCH /appointments/:id/complete` aceita `@Body() dto: { notes?: string }` como tipo inline em vez de um DTO com validacao class-validator. Isso bypassa o `ValidationPipe` para este endpoint.
- **Question:** Deve ser criado um `CompleteAppointmentDto` com decorators de validacao?

---

### 5. Data & Persistence

#### Q23. Tabela `refresh_tokens.family` usa `uuid()` mas `SignupService` e `InvitesService` geram strings hex

- **Where:** `src/infrastructure/database/schema/auth.schema.ts:74`, `src/modules/signup/signup.service.ts:201`, `src/modules/invites/invites.service.ts:382`
- **Why this matters:** O schema define `family` como `uuid("family")`, mas `SignupService` e `InvitesService` geram `randomBytes(16).toString("hex")` (32 chars hex, nao UUID format). Apenas `AuthService` usa `randomUUID()` (UUID v4). Isso pode causar inconsistencia no formato.
- **Question:** Isso causa problemas no PostgreSQL? O tipo `uuid` no Postgres aceita strings hex sem hifens?

#### Q24. Columns `updatedAt` nunca sao atualizadas automaticamente

- **Where:** Todas as tabelas no schema
- **Why this matters:** Quase todas as tabelas tem `updatedAt: timestamp("updated_at")` mas sem `.default()` e sem trigger de auto-update. As queries de update nos services nao incluem `updatedAt: new Date()` na maioria dos casos.
- **Question:** Os campos `updatedAt` estao sendo atualizados manualmente nos services? Ou deveria haver um trigger do PostgreSQL ou um middleware Drizzle para auto-update?

#### Q25. Dados JSONB sem validacao de schema

- **Where:** `src/infrastructure/database/schema/clinic-settings.schema.ts` (weeklySchedule, specificBlocks, priorities, painPoints, schedulingRules, etc.)
- **Why this matters:** Colunas JSONB como `weeklySchedule`, `specificBlocks`, `priorities`, etc. armazenam estruturas complexas sem validacao de schema no banco. A validacao depende apenas dos DTOs no controller (class-validator). Se dados forem escritos diretamente (seeds, migrations, scripts), podem ter formato invalido.
- **Question:** E aceitavel confiar apenas na validacao do DTO? Ou deveria haver CHECK constraints ou validacao adicional?

#### Q26. Projections tables (views) nao tem foreign keys

- **Where:** `src/infrastructure/database/schema/patient-view.schema.ts`, `appointment-view.schema.ts`, `conversation-view.schema.ts`, `patient-journey-view.schema.ts`
- **Why this matters:** As tabelas de projection (ex: `patient_view`, `appointment_view`) armazenam dados desnormalizados mas nao tem foreign keys para as tabelas de origem. Dados orfaos podem existir se os event handlers de projection falharem.
- **Question:** Isso e intencional para performance/desacoplamento do event sourcing? Ha mecanismos de reconciliacao para detectar projecoes desincronizadas?

---

### 6. Error Handling & Resilience

#### Q27. RLS middleware continua request mesmo se falhar

- **Where:** `src/infrastructure/database/middleware/rls.middleware.ts:26-29`
- **Why this matters:** Se o `set_config` falhar, o middleware faz `console.error` mas chama `next()`, permitindo que a request continue sem isolamento de tenant. O comentario diz "queries will return empty results", mas isso depende das policies de RLS estarem configuradas com DEFAULT DENY.
- **Question:** O comportamento correto deveria ser retornar 500 se o RLS context nao puder ser configurado? Ou o fail-open e intencional?

#### Q28. Carol chat tool-calling loop sem limite de iteracoes

- **Where:** `src/modules/carol/chat/carol-chat.service.ts:97-160`
- **Why this matters:** O loop `while (response.tool_calls && response.tool_calls.length > 0)` nao tem limite de iteracoes. Se a LLM ficar em loop chamando tools repetidamente, isso pode causar requests infinitos, custos altos com OpenAI e timeout.
- **Question:** Deveria haver um limite maximo de iteracoes (ex: 5-10)? Qual o comportamento esperado se o limite for atingido?

#### Q29. Emails fire-and-forget sem retry

- **Where:** `src/modules/signup/signup.service.ts:126-130`, `src/modules/invites/invites.service.ts:103-105`
- **Why this matters:** Emails de verificacao e convite sao enviados em fire-and-forget (`.catch(err => console.error(...))`). Se o envio falhar, o usuario nao recebe o email e nao ha retry. Para verificacao de email, o usuario pode ficar "preso" sem poder verificar.
- **Question:** Deveria haver um mecanismo de retry (ex: job queue)? Ou e aceitavel que o usuario solicite reenvio manualmente?

#### Q30. Event bus RabbitMQ sem dead letter queue aparente

- **Where:** `src/infrastructure/event-sourcing/event-bus/`
- **Why this matters:** Se um event handler falhar ao processar um evento, o evento pode ser perdido se nao houver DLQ configurado. Isso afeta a consistencia eventual das projections.
- **Question:** Ha uma dead letter queue configurada para eventos que falham no processamento? Como sao tratados erros nos event handlers?

---

### 7. Performance

#### Q31. Carol instancia ChatOpenAI a cada request

- **Where:** `src/modules/carol/chat/carol-chat.service.ts:63-67`
- **Why this matters:** A cada chamada de `processMessage`, uma nova instancia de `ChatOpenAI` e criada. Dependendo da implementacao do LangChain, isso pode incluir overhead de inicializacao desnecessario.
- **Question:** A instancia deveria ser reutilizada? Ou a criacao por request e necessaria (ex: por causa de diferentes configs por clinica)?

#### Q32. `IsClinicAdminGuard` faz 2 queries ao banco a cada request

- **Where:** `src/modules/clinics/guards/is-clinic-admin.guard.ts:20-53`
- **Why this matters:** O guard faz uma query para buscar a clinica e outra para verificar o role do usuario. Isso acontece em toda request protegida por este guard. Poderia ser otimizado com um unico JOIN ou cache.
- **Question:** O overhead de 2 queries por request e aceitavel? Deveria haver caching dos roles do usuario?

#### Q33. `EmailVerifiedGuard` faz query ao banco

- **Where:** `src/common/guards/email-verified.guard.ts:19-23`
- **Why this matters:** O guard faz uma query ao banco para verificar se o email do usuario esta verificado, em vez de confiar no JWT payload. Isso adiciona latencia a toda request que usa este guard.
- **Question:** O `emailVerified` poderia ser incluido no JWT payload para evitar a query? Ou a verificacao em tempo real e necessaria (ex: para revogar acesso imediatamente apos unverify)?

---

### 8. Testing & QA

#### Q34. Cobertura de testes muito baixa

- **Where:** 6 arquivos de teste encontrados em 261 arquivos TypeScript
- **Why this matters:** Apenas os domain aggregates tem testes unitarios (patient-journey, appointment, conversation, carol/infrastructure). Nao ha testes para: controllers, services, guards, middlewares, event handlers, projections, DTOs, auth flows.
- **Question:** Qual e a estrategia de testes? Ha intencao de aumentar a cobertura? Os testes E2E (mencionados no package.json) estao implementados?

#### Q35. Testes E2E configurados mas possivelmente incompletos

- **Where:** `apps/api/package.json:12-18` (scripts `test:e2e*`, `test:db:*`)
- **Why this matters:** Ha scripts para rodar testes E2E com Docker e banco de teste, mas nao foi possivel verificar quantos testes E2E existem.
- **Question:** Os testes E2E cobrem os fluxos criticos (signup, login, CRUD de pacientes, agendamento)? Ha CI pipeline que roda estes testes?

---

### 9. Observability

#### Q36. `console.log/error/warn` em vez de Logger do NestJS

- **Where:** 86 ocorrencias em 23 arquivos (seeds, services, middleware)
- **Why this matters:** Muitos servicos usam `console.error` em vez do `Logger` do NestJS. Isso perde: (1) contexto do modulo/classe, (2) formatacao estruturada, (3) integracao com sistemas de logging (ex: Datadog, Sentry). Notavelmente, o `signup.service.ts`, `invites.service.ts` e `rls.middleware.ts` usam `console.error` para erros criticos.
- **Question:** Deveria haver uma migracao para usar `Logger` do NestJS consistentemente? Ou `console.log` e aceitavel para o estagio atual?

#### Q37. Audit interceptor sem detalhes de implementacao verificados

- **Where:** `src/common/interceptors/audit.interceptor.ts` (referenciado em app.module.ts)
- **Why this matters:** O `AuditInterceptor` e registrado como APP_INTERCEPTOR global. Nao foi verificado se ele captura erros, performance metrics, ou apenas sucessos.
- **Question:** O interceptor de auditoria captura: responses de erro? Tempo de resposta? IP do usuario? User-agent?

---

### 10. Technical Debt / Suspicious Areas

#### Q38. TODO: Gerar token e enviar email (platform-admin reset password)

- **Where:** `src/modules/platform-admin/services/platform-admin-users.service.ts:460`
- **Why this matters:** Ha um `// TODO: Gerar token e enviar email` no reset de senha do platform-admin. Isso significa que a funcionalidade de reset de senha para usuarios via platform-admin pode estar incompleta.
- **Question:** O reset de senha via platform-admin funciona? Ou apenas define uma nova senha diretamente sem enviar email?

#### Q39. TODO: Conversation Aggregate nao integrado ao messaging

- **Where:** `src/modules/messaging/test/test-messaging.controller.ts:41-42`
- **Why this matters:** O TODO indica que o `simulate-message` do test controller deveria publicar eventos via Conversation Aggregate, mas isso nao foi implementado. Isso sugere que o fluxo de mensagens reais (via WhatsApp/messaging) nao esta conectado ao event sourcing.
- **Question:** O fluxo de mensagens reais (nao-teste) esta conectado ao Conversation Aggregate? Ou o messaging e o event sourcing ainda estao desconectados?

#### Q40. `better-auth` no package.json mas sem uso aparente

- **Where:** `apps/api/package.json:44`
- **Why this matters:** O pacote `better-auth` esta nas dependencias mas nao aparece ser usado em nenhum arquivo `.ts`. Isso adiciona tamanho desnecessario ao bundle.
- **Question:** `better-auth` esta sendo usado em algum lugar nao encontrado? Ou e uma dependencia que pode ser removida?

#### Q41. Dois drivers PostgreSQL instalados

- **Where:** `apps/api/package.json:54-55`
- **Why this matters:** Tanto `pg` quanto `postgres` (Postgres.js) estao nas dependencias. O codigo usa `pg` (node-postgres) para o Pool. `postgres` pode ser residual de uma configuracao anterior do Drizzle.
- **Question:** O pacote `postgres` esta sendo usado? Ou pode ser removido?

#### Q42. `CLINIC_TIMEZONE` como env var global em vez de configuracao por clinica

- **Where:** `src/modules/carol/tools/check-availability.tool.ts:8`, `src/modules/carol/chat/carol-chat.service.ts:206`, `src/modules/google-calendar/google-calendar.service.ts:266`
- **Why this matters:** O timezone da clinica e definido como env var global (`CLINIC_TIMEZONE`). Isso assume que todas as clinicas estao no mesmo fuso horario. Para um SaaS multi-tenant, clinicas podem estar em fusos diferentes.
- **Question:** O timezone deveria ser uma configuracao por clinica (armazenada na tabela `clinic_settings` ou `clinics`)? Ou o sistema e atualmente single-timezone?

#### Q43. Schema `users` como `any` causa cascade de perda de tipos

- **Where:** `src/infrastructure/database/schema/auth.schema.ts:35`
- **Why this matters:** A tipagem `const users: any` no schema faz com que TODAS as queries Drizzle envolvendo a tabela `users` percam type-safety. Isso inclui selects, inserts, updates, joins. E a tabela mais referenciada do sistema.
- **Question:** Qual foi a razao para tipar como `any`? E a self-reference em `deactivatedBy`? Ha um workaround do Drizzle para isso (ex: `$inferSelect`, `$inferInsert`)?

---

### 11. Missing Decisions / Open Design Gaps

#### Q44. Nao ha mecanismo de cleanup de refresh tokens expirados

- **Where:** `src/modules/auth/auth.service.ts:407-411`
- **Why this matters:** O metodo `cleanupExpiredTokens()` existe mas nao e chamado por nenhum cron job ou scheduled task. A tabela `refresh_tokens` pode crescer indefinidamente.
- **Question:** Quando/como o cleanup de tokens expirados e executado? Deveria haver um cron job?

#### Q45. RolesGuard definido mas nunca usado

- **Where:** `src/common/guards/roles.guard.ts`
- **Why this matters:** O `RolesGuard` esta implementado mas nenhum controller usa o decorator `@Roles(...)`. Toda autorizacao baseada em role e feita via `IsClinicAdminGuard` que verifica role hardcoded ("admin"/"manager").
- **Question:** O `RolesGuard` sera usado no futuro? Ou deveria ser removido para nao confundir?

#### Q46. EmailVerifiedGuard definido mas nunca usado

- **Where:** `src/common/guards/email-verified.guard.ts`
- **Why this matters:** O guard esta implementado mas nenhum controller ou route o utiliza. Usuarios com email nao verificado podem acessar toda a API normalmente.
- **Question:** A verificacao de email e obrigatoria para acessar a API? Se sim, o guard deveria ser aplicado globalmente ou em rotas especificas?

#### Q47. Event sourcing: nao ha mecanismo de replay de eventos

- **Where:** `src/infrastructure/event-sourcing/`
- **Why this matters:** Se uma projection se desincronizar ou um novo projection handler for adicionado, nao parece haver um mecanismo para replay de eventos historicos para reconstruir projections.
- **Question:** Ha planos para um mecanismo de replay? Como novas projections seriam populadas com dados historicos?

#### Q48. Sem health checks profundos

- **Where:** `src/health.controller.ts`
- **Why this matters:** O health check parece ser superficial. Para producao, deveria verificar: conectividade com PostgreSQL, conectividade com RabbitMQ, disponibilidade do servico de email, etc.
- **Question:** Ha planos para health checks mais profundos (liveness vs readiness probes)?

#### Q49. Swagger exposto em producao

- **Where:** `src/main.ts:99-119`
- **Why this matters:** O Swagger UI e configurado incondicionalmente, sem verificacao de ambiente. Em producao, isso expoe toda a documentacao da API, incluindo schemas de request/response.
- **Question:** O Swagger deve ser desabilitado em producao? Ou e intencional para integracao com terceiros?

#### Q50. Sem rate limiting por usuario, apenas por IP

- **Where:** `src/app.module.ts:35-48`
- **Why this matters:** O ThrottlerGuard limita requests por IP, mas nao por usuario autenticado. Um atacante com multiplos IPs pode fazer brute force sem ser limitado. Em dev, o rate limiting esta efetivamente desabilitado (1000 req/s).
- **Question:** Deveria haver rate limiting por userId alem de por IP? O rate limiting em dev deveria ser pelo menos parcialmente ativo para pegar bugs?

---

### 12. Security - Additional (from deep audit)

#### Q51. `Math.random()` usado para gerar senhas temporarias

- **Where:** `src/modules/platform-admin/services/platform-admin-users.service.ts` (funcao `generateSecurePassword`)
- **Why this matters:** A funcao usa `Math.random()` que **nao e criptograficamente seguro**. Senhas geradas sao previsıveis se o estado interno do PRNG for conhecido. Deveria usar `crypto.getRandomValues()` ou `crypto.randomBytes()`.
- **Question:** Isso pode ser corrigido imediatamente? O impacto e que senhas temporarias podem ser previsiveis.

#### Q52. Senha temporaria retornada na resposta da API

- **Where:** `src/modules/platform-admin/services/platform-admin-users.service.ts:473-496`
- **Why this matters:** O endpoint de reset de senha do platform-admin retorna a senha temporaria diretamente na response JSON. Isso significa que a senha fica visıvel em logs de API, capturas de rede e historico do browser.
- **Question:** A senha deveria ser enviada apenas por email seguro, nunca na resposta da API?

#### Q53. CreateAppointmentTool retorna dados mock

- **Where:** `src/modules/carol/tools/create-appointment.tool.ts`
- **Why this matters:** A tool `create_appointment` da Carol retorna dados simulados com o comentario "nao foi criado no sistema". Pacientes podem acreditar que o agendamento foi criado quando nao foi.
- **Question:** Isso esta documentado para os usuarios da Carol? Quando sera implementada a criacao real de agendamentos?

#### Q54. Deteccao de conflito de horario com logica invertida

- **Where:** `src/modules/appointment/application/appointment.service.ts:175-204`
- **Why this matters:** A logica de deteccao de overlap de agendamentos subtrai a duracao do horario de inicio (direcao errada). Deveria verificar: `existing_start < new_end AND existing_end > new_start`. A logica atual pode perder conflitos reais ou bloquear horarios validos.
- **Question:** A logica de conflito precisa ser reescrita? Ha testes E2E que validam cenarios de conflito?

#### Q55. Race condition: agendamento concorrente pode criar conflitos

- **Where:** `src/modules/appointment/application/appointment.service.ts:20-69`
- **Why this matters:** A verificacao de conflito (SELECT) e a criacao do agendamento (INSERT via event store) nao sao atomicas. Duas requests simultaneas podem ambas passar na verificacao e ambas inserir, criando conflitos. O event store tem optimistic locking no aggregate, mas nao no horario.
- **Question:** Deveria haver locking a nivel de banco (advisory lock por doctor+horario) ou constraint unico?

#### Q56. Projection handlers sem idempotencia

- **Where:** `src/modules/patient/application/event-handlers/patient-projection.handler.ts`, e handlers similares em appointment, conversation, patient-journey
- **Why this matters:** Todos os projection handlers usam `db.insert()` sem `onConflictDoUpdate()`. Se o RabbitMQ entregar o mesmo evento duas vezes (redelivery), o segundo insert falha com erro de chave duplicada. O evento vai para DLQ e a projection pode ficar desincronizada.
- **Question:** Os handlers devem usar upsert (`onConflictDoUpdate`) para garantir idempotencia?

#### Q57. DLQ configurada mas sem consumidor

- **Where:** `src/infrastructure/event-sourcing/event-bus/rabbitmq-event-bus.service.ts`
- **Why this matters:** Eventos que falham no processamento vao para a queue `healz.events.failed` (DLQ), mas nao ha consumidor ou mecanismo de retry para esta queue. Eventos mortos acumulam indefinidamente.
- **Question:** Quando sera implementado o consumidor da DLQ? Deveria haver alertas quando eventos caem na DLQ?

#### Q58. `user_clinic_roles` sem unique constraint

- **Where:** `src/infrastructure/database/schema/auth.schema.ts:55-65`
- **Why this matters:** A tabela `user_clinic_roles` nao tem um unique index em `(userId, clinicId)`. Isso permite que o mesmo usuario tenha multiplos roles na mesma clinica se houver race conditions ou bugs no codigo.
- **Question:** Deveria ser adicionado um unique constraint? Ou e intencional permitir multiplos roles?

#### Q59. Event store faz inserts sequenciais em vez de batch

- **Where:** `src/infrastructure/event-sourcing/event-store/event-store.service.ts`
- **Why this matters:** O metodo `appendMany()` itera pelos eventos e insere um por um dentro de uma transacao, em vez de usar batch insert do Drizzle (`db.insert().values([...events])`). Isso e O(n) queries em vez de O(1).
- **Question:** Deveria ser otimizado para batch insert? Qual o volume tipico de eventos por operacao?

#### Q60. Nao ha mecanismo de account lockout

- **Where:** `src/modules/auth/auth.service.ts:26-60`
- **Why this matters:** Apos 5 tentativas de login falhadas (rate limit por IP), o usuario pode simplesmente esperar 60 segundos e tentar novamente indefinidamente. Nao ha lockout por conta (ex: bloquear conta apos 10 tentativas). Um atacante com VPN pode fazer brute force sem limite.
- **Question:** Deveria haver lockout por conta alem do rate limit por IP? Ex: bloquear a conta apos N tentativas e exigir reset de senha?

#### Q61. Validacao de horarios de agenda ausente no DTO

- **Where:** `src/modules/clinic-settings/dto/clinic-scheduling.dto.ts`, `src/modules/clinic-settings/clinic-settings.service.ts`
- **Why this matters:** O `saveScheduling()` aceita qualquer `weeklySchedule` e `specificBlocks` sem validar: formato de hora (HH:MM), horario de inicio < fim, sobreposicao de blocos. A Carol pode retornar horarios invalidos baseados nesses dados.
- **Question:** Deveria haver validacao dos horarios nos DTOs? Ex: `from < to`, formato HH:MM, sem sobreposicao?

#### Q62. Logica de negocios no Process Manager em vez do Aggregate

- **Where:** `src/modules/patient-journey/application/process-managers/patient-journey.process-manager.ts:94-119`
- **Why this matters:** Regras de negocio como deteccao de milestones e threshold de cancelamentos (>=2) estao no Process Manager em vez de estar no Aggregate. Process Managers deveriam orquestrar, nao implementar regras de dominio. Isso dificulta testes e pode causar inconsistencias.
- **Question:** Essas regras deveriam ser movidas para o PatientJourney aggregate? Ou o design atual e intencional?

#### Q63. `clinic_id` com default empty string no Process Manager

- **Where:** `src/modules/patient-journey/application/process-managers/patient-journey.process-manager.ts:56`
- **Why this matters:** `clinicId: event.clinic_id ?? ""` usa string vazia como fallback se `clinic_id` estiver ausente no evento PatientRegistered. Isso cria um registro de journey com clinic_id invalido, que silenciosamente corrompe dados.
- **Question:** Deveria lancar erro se `clinic_id` estiver ausente em vez de usar string vazia?

---

## Answers

1. Esses endpoints não deveriam ser publicos
2. RLS deveria estar funcionando em produção
3. Esse endpoint deve ser removido.
4. GUards de autenticacao admin
5. Sim, deve ser adicionado
6. Sim, deve ser adicionado
7. Em produção não é aceitavel, somente em dev
8. Não sei responder.
9. Intencional
   10.Token service centralizado
10. Sim, deveria ser refatorado.
11. Deveria ser otimizado
12. Haverão os dois mundos porém queria que eles fossem mais organizados.
13. Deveria ser tipado
14. Por hora permanecerá assim
15. Há planos.
16. RLS
17. Deveria ter o guard
18. Não sei responder mas deveriam ter isolamento.
19. Por hora deixaremos assim.
20. Deve haver um padrão claro.
21. Deve ter um DTO tipado
22. Não sei dizer, melhor padronizar.
23. Deve ser automático via drizzle.
24. Deveria ter validação de schema.
25. Por hora não faremos nada.
26. A request deve falhar se não houver isolamento do tenant.
27. Deveria ter um limite. Podemos começar básico.
28. Não faremos nada
29. Não faremos nada
30. Deveria ser reutilizada.
31. Deveria ser otimizada mas não quero usar cache redis ou algo do tipo agr, quero otimizar somente na camada da aplicação.
32. Poderia ser incluido do JWT
33. Deixar como está
34. Deixar como está
35. Deveria usar o logger do NestJS
36. Deixar como está
37. Deixar como está
38. Deixar como está
39. Pode ser removida
40. Podemos usar um só
41. Pode ser no clinic_settings e pode ser padrão UTC-3 pra todas por hora pois só atenderemos brazil.
42. Não foi intencional, deveria ser tipado.
43. Deixar como está
44. Pode ser removido pra não confundir.
45. Aplicado globalmente
46. Há planos.
47. Há planos.
48. Não fazer nada
49. Sim
50. Refatorar.
51. Deveria ser ajustado.
52. Não fazer nada.
53. Não fazer nada.
54. Não fazer nada.
55. Sim
56. Será implementado mas ainda não há prazos.
57. Não fazer nada.
58. Sim
59. Não fazer nada.
60. Não fazer nada.
61. Sim
62. SIm.
