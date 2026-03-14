# 040 - Database Seeds

## Objetivo

Criar um sistema completo de seeds que popula o banco com dados realistas usando Faker.js, simulando um ambiente multi-tenant de produção com centenas de registros, permitindo testar todos os fluxos da aplicação imediatamente.

---

## Cenário Simulado

### Organizações e Clínicas

| Organização | Clínicas | Cenário |
|---|---|---|
| **Clínica Estética Bella Vita** | 2 clínicas (SP e RJ) | Clínica ativa, setup completo |
| **Instituto Odontológico SmilePlus** | 1 clínica (BH) | Clínica ativa, setup parcial |
| **Centro Médico Vida Plena** | 1 clínica (Curitiba) | Clínica inativa (cancelada) |

### Usuários de Teste (Login)

| Email | Senha | Role | Contexto |
|---|---|---|---|
| `admin@healz.com` | `Admin123!` | Platform Admin | Acesso total à plataforma |
| `joao@bellavita.com` | `Test123!` | admin | Admin da Bella Vita (org 1) |
| `maria@bellavita.com` | `Test123!` | manager | Manager da Bella Vita SP |
| `dr.carlos@bellavita.com` | `Test123!` | doctor | Médico na Bella Vita SP + RJ |
| `ana@bellavita.com` | `Test123!` | receptionist | Recepcionista Bella Vita SP |
| `pedro@smileplus.com` | `Test123!` | admin | Admin do SmilePlus (org 2) |
| `dr.lucia@smileplus.com` | `Test123!` | doctor | Dentista no SmilePlus |
| `viewer@bellavita.com` | `Test123!` | viewer | Viewer (somente leitura) |
| `inativo@bellavita.com` | `Test123!` | admin | Usuário desativado |

### Volume de Dados

| Entidade | Quantidade | Notas |
|---|---|---|
| Organizations | 3 | Multi-tenant |
| Clinics | 4 | Distribuídas nas orgs |
| Addresses | 4 | Uma por clínica |
| Users | ~15 | Roles variados |
| user_clinic_roles | ~20 | Usuários multi-clínica |
| platform_admins | 1 | admin@healz.com |
| doctor_profiles | 5 | Com CRM, specialty, bio |
| doctor_clinics | 8 | Doctors em múltiplas clínicas |
| doctor_clinic_schedules | 8 | Horários realistas |
| procedures | ~30 | ~10 por clínica ativa |
| doctor_clinic_procedures | ~40 | Com preços variados |
| payment_methods | ~15 | ~5 por clínica ativa |
| clinic_objectives | 3 | Prioridades e pain points |
| clinic_services | 3 | Serviços com valores |
| clinic_scheduling | 3 | Horários semanais |
| clinic_carol_settings | 3 | Config IA (1 published, 2 draft) |
| clinic_notifications | 3 | Diferentes canais |
| patient_view | ~100 | Faker: nomes, telefones BR |
| appointment_view | ~200 | Status variados, últimos 3 meses |
| conversation_view | ~80 | WhatsApp, diferentes status |
| message_view | ~400 | ~5 msgs por conversa |
| patient_journey_view | ~100 | Stages e risk scores variados |
| audit_logs | ~50 | Ações recentes simuladas |
| invites | 5 | Usados + pendentes + expirados |

---

## Arquitetura dos Seeds

```
apps/api/src/infrastructure/database/seeds/
├── seed.ts                      # Entry point - orquestra tudo
├── reset.ts                     # Limpa banco (truncate com cascade)
├── config.ts                    # Constantes e configuração
├── helpers.ts                   # Utilitários (hash, uuid, dates)
├── seeders/
│   ├── 01-organizations.seeder.ts
│   ├── 02-addresses.seeder.ts
│   ├── 03-clinics.seeder.ts
│   ├── 04-users.seeder.ts       # Users + user_clinic_roles + platform_admins
│   ├── 05-invites.seeder.ts
│   ├── 06-doctor-profiles.seeder.ts
│   ├── 07-doctor-clinics.seeder.ts  # + schedules
│   ├── 08-procedures.seeder.ts
│   ├── 09-doctor-procedures.seeder.ts
│   ├── 10-payment-methods.seeder.ts
│   ├── 11-clinic-settings.seeder.ts  # objectives, services, scheduling, carol, notifications
│   ├── 12-patients.seeder.ts         # patient_view (faker)
│   ├── 13-conversations.seeder.ts    # conversation_view + message_view (faker)
│   ├── 14-appointments.seeder.ts     # appointment_view (faker)
│   ├── 15-patient-journeys.seeder.ts # patient_journey_view
│   └── 16-audit-logs.seeder.ts
└── data/
    ├── organizations.data.ts    # Dados fixos das orgs
    ├── users.data.ts            # Dados fixos dos usuários de teste
    ├── procedures.data.ts       # Catálogo de procedimentos por especialidade
    └── clinic-settings.data.ts  # Configurações de clínica
```

### Padrão de cada Seeder

```typescript
// Cada seeder exporta uma função async que recebe o context
export interface SeedContext {
  organizationIds: Record<string, string>;
  clinicIds: Record<string, string>;
  userIds: Record<string, string>;
  doctorClinicIds: Record<string, string>;
  patientIds: string[];
  // ... outros IDs necessários para relacionamentos
}

export async function seedOrganizations(ctx: SeedContext): Promise<void> {
  // Insere dados e popula ctx com IDs gerados
}
```

---

## Tarefas de Implementação

### Task 1: Setup e Infraestrutura
**Arquivos:** `config.ts`, `helpers.ts`, `reset.ts`, `seed.ts`

1. Instalar `@faker-js/faker` como devDependency
2. Criar `config.ts` com constantes (senhas, quantidades, date ranges)
3. Criar `helpers.ts` com utilitários:
   - `hashPassword(plain)` — bcrypt hash
   - `randomUUID()` — gera UUIDs determinísticos (seed do faker)
   - `randomDate(from, to)` — datas aleatórias no range
   - `randomPhone()` — telefone BR formato +55...
   - `pickRandom(array)` — seleciona item aleatório
4. Criar `reset.ts` — truncate de todas as tabelas com CASCADE (ordem inversa de dependência)
5. Criar `seed.ts` — entry point que:
   - Aceita flags: `--reset` (limpa antes), `--verbose` (logs detalhados)
   - Executa seeders na ordem correta
   - Exibe resumo no final (contagem por tabela)
   - Trata erros com rollback
6. Adicionar scripts no `package.json`:
   - `"db:seed": "dotenv -e .env -- pnpm tsx src/infrastructure/database/seeds/seed.ts"`
   - `"db:seed:reset": "dotenv -e .env -- pnpm tsx src/infrastructure/database/seeds/seed.ts --reset"`
   - `"db:reset": "dotenv -e .env -- pnpm tsx src/infrastructure/database/seeds/reset.ts"`

### Task 2: Dados Base (Orgs, Addresses, Clinics)
**Arquivos:** `data/organizations.data.ts`, `seeders/01-organizations.seeder.ts`, `seeders/02-addresses.seeder.ts`, `seeders/03-clinics.seeder.ts`

1. Definir dados fixos das 3 organizações com slugs únicos
2. Criar 4 endereços realistas (ruas reais de SP, RJ, BH, Curitiba)
3. Criar 4 clínicas vinculadas às orgs e endereços
4. 1 clínica com status `inactive` (Centro Médico Vida Plena)

### Task 3: Usuários e Roles
**Arquivos:** `data/users.data.ts`, `seeders/04-users.seeder.ts`, `seeders/05-invites.seeder.ts`

1. Criar ~15 usuários com dados fixos (email/senha documentados)
2. Hash de senhas com bcrypt (reusar `helpers.ts`)
3. Atribuir `user_clinic_roles` — incluir cenário de user multi-clínica
4. Criar 1 platform_admin (admin@healz.com)
5. Criar 1 usuário desativado (status: inactive, com deactivatedAt/reason)
6. Criar 5 invites: 2 aceitos, 2 pendentes, 1 expirado

### Task 4: Domínio Doctor
**Arquivos:** `seeders/06-doctor-profiles.seeder.ts`, `seeders/07-doctor-clinics.seeder.ts`

1. Criar 5 `doctor_profiles` com CRM, specialty, bio realistas
2. Vincular doctors a clínicas via `doctor_clinics` (8 vínculos)
3. Criar `doctor_clinic_schedules` com horários realistas:
   - Seg-Sex: 08:00-12:00 / 14:00-18:00 (com variações)
   - Alguns com sábado manhã
   - `specificBlocks`: férias, feriados nos próximos dias

### Task 5: Procedimentos e Pagamentos
**Arquivos:** `data/procedures.data.ts`, `seeders/08-procedures.seeder.ts`, `seeders/09-doctor-procedures.seeder.ts`, `seeders/10-payment-methods.seeder.ts`

1. Criar catálogo de ~30 procedures por especialidade:
   - Estética: Botox, Preenchimento, Peeling, Limpeza de Pele, etc.
   - Odontologia: Limpeza, Restauração, Canal, Clareamento, etc.
   - Geral: Consulta, Retorno, Avaliação, etc.
2. Vincular procedures a doctors via `doctor_clinic_procedures`:
   - Preços variados (R$80 - R$2.500)
   - Alguns com `durationOverride`
   - Alguns inativos
3. Criar payment_methods por clínica (~5 cada):
   - PIX, cartão crédito/débito, dinheiro, convênio
   - 1-2 inativos por clínica

### Task 6: Configurações de Clínica
**Arquivos:** `data/clinic-settings.data.ts`, `seeders/11-clinic-settings.seeder.ts`

1. `clinic_objectives`: prioridades e pain points realistas por clínica
2. `clinic_services`: serviços com duração e valores
3. `clinic_scheduling`: horários semanais com exceções
4. `clinic_carol_settings`:
   - Bella Vita SP: published (Carol configurada e ativa)
   - SmilePlus: draft (em configuração)
   - Outras: draft com defaults
5. `clinic_notifications`: variação de canais (whatsapp, telefones diferentes)

### Task 7: Pacientes (Faker)
**Arquivo:** `seeders/12-patients.seeder.ts`

1. Gerar ~100 pacientes com Faker (locale pt_BR):
   - Nomes brasileiros realistas
   - Telefones formato +5511999999999
   - Emails (alguns null)
   - Datas de nascimento (18-85 anos)
   - Status variados: ~85 active, ~10 inactive, ~5 sem nome (só phone)
2. Distribuir entre clínicas ativas (~40 Bella Vita SP, ~30 Bella Vita RJ, ~30 SmilePlus)
3. Metadata com tags aleatórias (source: whatsapp/indicação/instagram)

### Task 8: Conversas e Mensagens (Faker)
**Arquivo:** `seeders/13-conversations.seeder.ts`

1. Gerar ~80 conversations vinculadas a pacientes:
   - ~60 active, ~15 closed, ~5 archived
   - Canal: ~90% whatsapp, ~10% outros
   - ~5 escalated (com escalatedToUserId)
   - messageCount e lastMessageAt consistentes
2. Gerar ~400 messages (média 5 por conversa):
   - Direções alternadas (incoming/outgoing)
   - sentBy variado (patient, bot, agent)
   - Conteúdos realistas (saudações, perguntas de horário, confirmações)
   - Alguns com intent (scheduling, cancellation, question)
   - Timestamps sequenciais dentro da conversa

### Task 9: Agendamentos (Faker)
**Arquivo:** `seeders/14-appointments.seeder.ts`

1. Gerar ~200 appointments nos últimos 3 meses + próximas 2 semanas:
   - Passados: ~60 completed, ~20 cancelled, ~10 no_show
   - Futuros: ~30 scheduled, ~15 confirmed
   - Horários realistas (horário comercial, duração 30-60 min)
   - Vinculados a doctorIds e patientIds existentes
2. Reasons e notes realistas com Faker
3. Timestamps consistentes (confirmedAt < scheduledAt, etc.)

### Task 10: Patient Journeys
**Arquivo:** `seeders/15-patient-journeys.seeder.ts`

1. Gerar 100 journeys (1 por paciente):
   - Distribuição de stages: ~20 LEAD, ~15 ENGAGED, ~15 SCHEDULED, ~10 CONFIRMED, ~15 IN_TREATMENT, ~10 COMPLETED, ~5 DROPPED, ~10 AT_RISK
   - Risk scores coerentes com stage (AT_RISK: 60-100, COMPLETED: 0-20, etc.)
   - Risk levels derivados do score
   - Milestones populados conforme stage avançou
   - stageHistory com timestamps sequenciais

### Task 11: Audit Logs e Finalização
**Arquivo:** `seeders/16-audit-logs.seeder.ts`

1. Gerar ~50 audit logs simulando ações recentes:
   - LOGIN, LOGIN_FAILED (senha errada), CREATE, UPDATE, DELETE
   - Resources variados (/api/v1/clinics, /api/v1/appointments, etc.)
   - IPs e user agents realistas
   - Distribuídos nos últimos 7 dias

### Task 12: Documentação e Scripts
1. Atualizar `seed.ts` com resumo final formatado (tabela com contagens)
2. Criar seção no plano com instruções de uso
3. Testar execução completa: `pnpm db:seed:reset`
4. Validar integridade referencial (todas as FKs resolvem)

---

## Comandos de Uso

```bash
# Popular banco (dados acumulam)
cd apps/api && pnpm db:seed

# Resetar e popular do zero
cd apps/api && pnpm db:seed:reset

# Apenas limpar banco
cd apps/api && pnpm db:reset
```

---

## Dependências

- `@faker-js/faker` (devDependency) — dados realistas pt_BR
- `bcrypt` (já instalado) — hash de senhas
- `drizzle-orm` + `pg` (já instalados) — acesso ao banco

---

## Ordem de Execução (Respeitando FKs)

```
1.  organizations        (sem dependência)
2.  addresses            (sem dependência)
3.  clinics              (→ organizations, addresses)
4.  users                (sem dependência)
5.  user_clinic_roles    (→ users, clinics)
6.  platform_admins      (→ users)
7.  invites              (→ users, clinics, organizations)
8.  doctor_profiles      (→ users)
9.  doctor_clinics       (→ users, clinics)
10. doctor_clinic_schedules (→ doctor_clinics)
11. procedures           (→ clinics)
12. doctor_clinic_procedures (→ doctor_clinics, procedures)
13. payment_methods      (→ clinics)
14. clinic_objectives    (→ clinics)
15. clinic_services      (→ clinics)
16. clinic_scheduling    (→ clinics)
17. clinic_carol_settings (→ clinics)
18. clinic_notifications (→ clinics)
19. patient_view         (sem FK, mas usa tenantId/clinicId)
20. conversation_view    (sem FK, usa patientId)
21. message_view         (sem FK, usa conversationId)
22. appointment_view     (sem FK, usa patientId/doctorId)
23. patient_journey_view (sem FK, usa patientId)
24. audit_logs           (sem FK)
```

---

## Notas Importantes

- **Não gerar seeds para:** `events` (event store — seria inconsistente com projections), `refresh_tokens` (gerados no login), `clinic_google_calendar_credentials` (requer OAuth real), `clinic_appointment_gcal_events` (depende de GCal)
- **Faker seed fixo:** Usar `faker.seed(12345)` para dados reprodutíveis
- **Transactions:** Cada seeder roda dentro de uma transaction para rollback em caso de erro
- **Idempotência:** O script com `--reset` trunca tudo antes; sem flag, verifica se já existem dados e pula seeders já executados
