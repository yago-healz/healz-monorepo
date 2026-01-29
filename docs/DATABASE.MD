# Modelo de Dados - Healz

## Visão Geral

O Healz utiliza **Event Sourcing** como estratégia principal de persistência. Todo evento relevante que ocorre na plataforma é armazenado de forma imutável no **Event Store**, que é a fonte da verdade do sistema.

Para entender a arquitetura multi-tenant (organizações, clínicas, usuários), veja [MULTI_TENANT.MD](./MULTI_TENANT.MD).

---

## Event Store

### Propósito

O Event Store é a **fonte da verdade** do sistema. Todo evento relevante que ocorre na plataforma é armazenado de forma imutável, permitindo:

- Auditoria completa da jornada do paciente
- Reconstrução de estado a qualquer momento
- Rastreabilidade de decisões e ações
- Base para inteligência e detecção de padrões

### Schema do Event Store

#### Tabela: `events`

**Colunas principais**:

| Coluna              | Tipo         | Descrição                                                      |
| ------------------- | ------------ | -------------------------------------------------------------- |
| `id`                | BIGSERIAL    | ID sequencial (performance)                                    |
| `event_id`          | UUID         | Identificador único global do evento                           |
| `event_type`        | VARCHAR(255) | Tipo do evento (ex: "MessageReceived", "AppointmentConfirmed") |
| `event_data`        | JSONB        | Payload do evento com dados específicos                        |
| `aggregate_type`    | VARCHAR(100) | Tipo do agregado (ex: "Conversation", "Appointment")           |
| `aggregate_id`      | UUID         | ID da entidade que gerou o evento                              |
| `aggregate_version` | INTEGER      | Versão sequencial do agregado (1, 2, 3...)                     |
| `tenant_id`         | UUID         | ID da organização (isolamento multi-tenant)                    |
| `clinic_id`         | UUID         | ID da clínica (opcional, para eventos específicos)             |
| `causation_id`      | UUID         | ID do evento/comando que causou este evento                    |
| `correlation_id`    | UUID         | ID que agrupa eventos da mesma operação de negócio             |
| `user_id`           | UUID         | Quem iniciou a ação (paciente, atendente, sistema)             |
| `created_at`        | TIMESTAMPTZ  | Timestamp de criação                                           |
| `metadata`          | JSONB        | Metadados flexíveis adicionais                                 |

**Constraints**:

- `UNIQUE (aggregate_id, aggregate_version)`: Garante versão única por agregado
- `NOT NULL` em: event_type, event_data, aggregate_type, aggregate_id, tenant_id

### Conceitos Fundamentais

#### Aggregate (Agregado)

- Entidade raiz que garante consistência
- Exemplos: `Conversation`, `Appointment`, `PatientJourney`
- Todos os eventos de um agregado têm versão incremental
- Versão sequencial detecta problemas de concorrência

#### Causation vs Correlation

- **causation_id**: Rastreio direto - qual evento causou este?
- **correlation_id**: Rastreio de fluxo - todos os eventos da mesma operação compartilham o mesmo correlation_id

Exemplo:

```
correlation_id: "flow-abc123"
  ├─ MessageReceived (causation_id: null)
  ├─ IntentDetected (causation_id: event_id do MessageReceived)
  ├─ SlotReserved (causation_id: event_id do IntentDetected)
  └─ AppointmentConfirmed (causation_id: event_id do SlotReserved)
```

#### Multi-tenancy no Event Store

- **tenant_id**: Sempre presente, isola dados entre organizações
- **clinic_id**: Opcional, permite filtrar eventos de clínica específica
- RLS (Row-Level Security) garante isolamento automático

Veja [MULTI_TENANT.MD](./MULTI_TENANT.MD) para detalhes sobre isolamento.

### Índices Estratégicos

| Índice                              | Propósito                           |
| ----------------------------------- | ----------------------------------- |
| `(aggregate_id, aggregate_version)` | Reconstruir estado de um agregado   |
| `(tenant_id, created_at DESC)`      | Queries filtradas por organização   |
| `(event_type, created_at DESC)`     | Construir projections por tipo      |
| `(correlation_id, created_at)`      | Rastrear fluxo completo de operação |
| `(clinic_id, created_at DESC)`      | Performance para clínica específica |

### Estratégia de Particionamento

**Atual**: Tabela única sem particionamento

**Futuro** (quando > 10M eventos):

- Particionamento por `created_at` (mensal ou trimestral)
- Utilizar particionamento nativo do PostgreSQL
- **Não particionar por tenant**: Dificulta queries cross-tenant

### Exemplo de Evento

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440001",
  "event_type": "AppointmentConfirmed",
  "event_data": {
    "appointment_id": "appt-123",
    "patient_id": "patient-456",
    "doctor_id": "doctor-789",
    "scheduled_for": "2025-02-15T14:00:00Z",
    "clinic_id": "clinic-abc",
    "confirmed_by": "patient",
    "confirmation_method": "whatsapp"
  },
  "aggregate_type": "Appointment",
  "aggregate_id": "appt-123",
  "aggregate_version": 3,
  "tenant_id": "org-xyz",
  "clinic_id": "clinic-abc",
  "causation_id": "550e8400-e29b-41d4-a716-446655440000",
  "correlation_id": "flow-scheduling-001",
  "user_id": "patient-456",
  "created_at": "2025-01-29T10:30:00Z",
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "WhatsApp/2.23.1"
  }
}
```

---

## Decisões Arquiteturais

### Soft Delete vs Hard Delete

**Decisão**: Usar `status` em vez de `deleted_at`

**Razão**:

- Mais flexível (active, inactive, suspended, cancelled)
- Evita problema de NULL em queries
- Melhor para auditoria

**Implicação**: Sempre filtrar por status nas queries

---

## Questões em Aberto

### Retention Policy de Eventos

- **Questão**: Por quanto tempo manter eventos no Event Store?
- **Contexto**: Healthcare geralmente exige retenção longa (anos)
- **Opções**: Arquivamento após X anos? Particionamento por idade?

### Estratégia de Backup

- **Questão**: Como garantir backup do Event Store?
- **Contexto**: É a fonte da verdade, perda é catastrófica
- **Decisão pendente**: Point-in-time recovery? Replicação?

---

## Próximos Passos

1. ✅ Event Store Schema definido
2. ✅ Modelo Multi-tenant completo (ver MULTI_TENANT.MD)
3. ⏳ **Próximo**: Definir agregados e bounded contexts (AGGREGATES.md)
4. ⏳ Catálogo completo de eventos (EVENTS.md)
5. ⏳ Máquina de estados (STATE_MACHINE.md)
