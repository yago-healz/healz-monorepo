# Plano 038 — Doctor Domain Model

**Objetivo:** Implementar a nova modelagem de dados para médicos, procedimentos, agendas por médico/clínica e formas de pagamento, com endpoints REST completos para o frontend.

---

## Contexto

O sistema atual tem limitações:
- Doctor existe apenas como User com role, sem atributos médicos (CRM, especialidade)
- Serviços são JSONB em `clinic_services` — não reusáveis, sem vínculo com médico
- Agenda é no nível da clínica (`clinic_scheduling`), não por médico
- Sem modelo de pricing por médico/clínica
- Sem formas de pagamento

O domain model proposto (ver `domain-model.md`) resolve isso com 6 novas entidades.

## Arquitetura

Estas entidades são **CRUD puro** (não event-sourced). Seguem o padrão de `clinic-settings`: schema Drizzle + service + controller + DTOs. Não precisam de aggregates/event store porque:
- São dados de configuração, não transacionais
- Não têm state machine nem regras de negócio complexas
- O padrão já existe e funciona bem para settings

## Tabela de Tarefas

| # | Arquivo | Descrição | Depende de |
|---|---------|-----------|------------|
| 01 | [01-schemas.md](01-schemas.md) | Schemas Drizzle para as 6 novas tabelas | — |
| 02 | [02-migration.md](02-migration.md) | Gerar e aplicar migration Drizzle | 01 |
| 03 | [03-doctor-profiles-api.md](03-doctor-profiles-api.md) | CRUD `doctor_profiles` (perfil médico) | 02 |
| 04 | [04-doctor-clinics-api.md](04-doctor-clinics-api.md) | CRUD `doctor_clinics` (vínculo médico↔clínica) | 02 |
| 05 | [05-procedures-api.md](05-procedures-api.md) | CRUD `procedures` (catálogo de procedimentos) | 02 |
| 06 | [06-doctor-clinic-procedures-api.md](06-doctor-clinic-procedures-api.md) | CRUD `doctor_clinic_procedures` (procedimentos por médico/clínica) | 04, 05 |
| 07 | [07-doctor-clinic-schedules-api.md](07-doctor-clinic-schedules-api.md) | CRUD `doctor_clinic_schedules` (agenda por médico/clínica) | 04 |
| 08 | [08-payment-methods-api.md](08-payment-methods-api.md) | CRUD `payment_methods` (formas de pagamento) | 02 |

## Ordem de Execução

```
1. [01-schemas.md] — definir todas as tabelas
2. [02-migration.md] — gerar e aplicar migration (depende de 01)
3. [03-doctor-profiles-api.md] + [05-procedures-api.md] + [08-payment-methods-api.md] — PARALELO (independentes entre si)
4. [04-doctor-clinics-api.md] — vínculo médico/clínica (depende de 03 para FK doctor)
5. [06-doctor-clinic-procedures-api.md] + [07-doctor-clinic-schedules-api.md] — PARALELO (ambos dependem de 04)
```

## Fora do Escopo

- Migração de dados de `clinic_services` → `procedures` (será um plano separado)
- Migração de `clinic_scheduling` → `doctor_clinic_schedules` (será um plano separado)
- Deprecação das tabelas antigas
- Aggregate event-sourced para Doctor (mencionado no domain-model, mas premature — CRUD atende por agora)
- Ajustes no frontend
- Ajustes no assistente virtual (Carol)
