# Arquitetura Multi-tenant - Healz

## Visão Geral

O Healz é uma plataforma multi-tenant que suporta organizações com múltiplas clínicas, médicos e usuários. A arquitetura permite isolamento completo de dados entre organizações, enquanto facilita operações em múltiplas clínicas dentro da mesma organização.

Para detalhes sobre o Event Store e persistência de eventos, veja [DATABASE.MD](./DATABASE.MD).

---

## Hierarquia Organizacional

```
Organization (tenant)
  └─ Clinic (location)
      └─ Doctor (provider)
          └─ DoctorSchedule (availability)
```

---

## Entidades Principais

### Organization

**Propósito**: Tenant raiz, representa grupo médico ou rede de clínicas

**Atributos**:

- `id` (UUID): Identificador único
- `name`: Nome da organização
- `slug`: Identificador amigável para URLs
- `status`: active, suspended, cancelled
- `settings` (JSONB): Configurações globais
- Timestamps: created_at, updated_at

**Invariantes**:

- Slug deve ser único globalmente
- Status inicial sempre "active"

---

### Clinic

**Propósito**: Unidade física de atendimento dentro de uma organização

**Atributos**:

- `id` (UUID): Identificador único
- `organization_id`: FK para Organization
- `name`: Nome da clínica
- `slug`: Identificador único dentro da org
- `phone`, `email`: Contatos
- `address` (JSONB): Endereço completo
- `timezone`: Fuso horário (default: America/Sao_Paulo)
- `settings` (JSONB): Configurações que sobrescrevem org
- `whatsapp_number`: Número do WhatsApp Business
- `whatsapp_business_id`: ID na Meta Cloud API
- `whatsapp_access_token`: Token de acesso (criptografado)
- `status`: active, inactive

**Invariantes**:

- Slug único por organização
- WhatsApp number único globalmente
- Timezone obrigatório

**Constraint**: `UNIQUE (organization_id, slug)`

---

### User

**Propósito**: Pessoa que acessa o sistema (médicos, recepcionistas, gestores)

**Atributos**:

- `id` (UUID): Identificador único
- `auth_provider_id`: ID externo (Auth0/Clerk)
- `email`: Email único
- `full_name`: Nome completo
- `phone`: Telefone
- `status`: active, inactive, suspended

**Invariantes**:

- Email único globalmente
- Um user pode pertencer a múltiplas organizations/clinics

---

### Role

**Propósito**: Define papéis e permissões no sistema

**Roles predefinidos**:

- `admin`: Controle total da organização
- `manager`: Gestão de clínicas e relatórios
- `doctor`: Acesso a agenda e pacientes
- `receptionist`: Agendamento e atendimento
- `viewer`: Apenas visualização

**Atributos**:

- `id` (UUID)
- `name`: Nome único do role
- `description`: Descrição do papel
- `permissions` (JSONB): Array de permissões

Exemplo de permissions:

```json
[
  "appointments.view",
  "appointments.create",
  "appointments.update",
  "patients.view",
  "escalations.manage"
]
```

---

### OrganizationUser

**Propósito**: Relacionamento User ↔ Organization com role

**Atributos**:

- `organization_id`: FK para Organization
- `user_id`: FK para User
- `role_id`: FK para Role
- `status`: active, inactive

**Constraint**: `UNIQUE (organization_id, user_id)`

**Semântica**: Um usuário tem um role por organização

---

### ClinicUser

**Propósito**: Relacionamento User ↔ Clinic com role específico

**Atributos**:

- `clinic_id`: FK para Clinic
- `user_id`: FK para User
- `role_id`: FK para Role
- `custom_permissions` (JSONB): Override de permissões específicas
- `status`: active, inactive

**Constraint**: `UNIQUE (clinic_id, user_id)`

**Semântica**: Um usuário pode ter roles diferentes em clínicas diferentes

---

### Doctor

**Propósito**: Profissional médico que atende pacientes

**Atributos**:

- `id` (UUID)
- `user_id` (opcional): Vincula a um User se médico usar o sistema
- `professional_name`: Nome profissional
- `crm`: Número do CRM
- `crm_state`: Estado do CRM
- `specialties` (JSONB): Array de especialidades
- `settings` (JSONB): Preferências do médico
- `status`: active, inactive

**Invariantes**:

- CRM único por estado
- Médico pode existir sem User (nem todo médico acessa o sistema)

**Constraint**: `UNIQUE (crm, crm_state)`

---

### ClinicDoctor

**Propósito**: Relacionamento Doctor ↔ Clinic (médico pode atender em várias clínicas)

**Atributos**:

- `clinic_id`: FK para Clinic
- `doctor_id`: FK para Doctor
- `consultation_duration_minutes`: Duração padrão da consulta
- `price`: Valor da consulta
- `accepts_new_patients`: Aceita novos pacientes
- `schedule_config` (JSONB): Horários de atendimento nesta clínica
- `status`: active, inactive

**Constraint**: `UNIQUE (clinic_id, doctor_id)`

**Exemplo de schedule_config**:

```json
{
  "monday": [
    { "start": "09:00", "end": "12:00" },
    { "start": "14:00", "end": "18:00" }
  ],
  "tuesday": [{ "start": "09:00", "end": "12:00" }],
  "wednesday": [],
  "thursday": [{ "start": "14:00", "end": "18:00" }],
  "friday": [{ "start": "09:00", "end": "12:00" }],
  "saturday": [],
  "sunday": []
}
```

---

### Patient

**Propósito**: Pessoa que interage com o sistema e recebe atendimento

**Atributos**:

- `id` (UUID)
- `organization_id`: FK para Organization
- `phone`: Telefone (identificador principal via WhatsApp)
- `email`: Email (opcional)
- `full_name`: Nome completo
- `birth_date`: Data de nascimento
- `gender`: Gênero
- `cpf`: CPF (único)
- `address` (JSONB): Endereço completo
- `preferences` (JSONB): Preferências de comunicação e atendimento
- `medical_history` (JSONB): Histórico médico básico
- `last_interaction_at`: Última interação com o sistema
- `interaction_count`: Contador de interações
- `retention_score`: Score de retenção (0.00 a 1.00)
- `status`: active, inactive

**Invariantes**:

- Phone único por organização
- CPF único globalmente
- Paciente pertence a uma organização, mas pode visitar múltiplas clínicas

**Constraint**: `UNIQUE (organization_id, phone)`

---

### PatientClinicHistory

**Propósito**: Histórico de interação do paciente com cada clínica

**Atributos**:

- `patient_id`: FK para Patient
- `clinic_id`: FK para Clinic
- `first_visit_at`: Primeira visita
- `last_visit_at`: Última visita
- `total_appointments`: Total de consultas
- `notes` (JSONB): Anotações específicas desta relação

**Constraint**: `UNIQUE (patient_id, clinic_id)`

---

## Estratégias de Isolamento

### Row-Level Security (RLS)

**Propósito**: Garantir isolamento automático a nível de banco de dados

**Implementação**:

- Políticas (policies) aplicadas em tabelas sensíveis
- Contexto do usuário passado via `SET LOCAL app.current_user_id`
- Filtros automáticos aplicados em todas as queries

**Exemplo de Policy**:

```sql
-- Usuários só veem clínicas da sua organização
CREATE POLICY clinic_isolation ON clinics
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );
```

**Tabelas com RLS**:

- `clinics`
- `patients`
- `doctors`
- `events` (via tenant_id)

### Application-Level Isolation

**Queries sempre incluem**:

- `WHERE tenant_id = :currentTenantId`
- `WHERE organization_id = :currentOrgId`

**Benefícios**:

- Defesa em profundidade (RLS + app)
- Maior controle sobre performance
- Flexibilidade para queries complexas

---

## Autenticação e Context Switching

### JWT Token Structure

```json
{
  "user_id": "uuid-do-usuario",
  "organization_id": "uuid-da-org-atual",
  "clinic_id": "uuid-da-clinica-atual",
  "role": "receptionist",
  "permissions": ["appointments.view", "appointments.create", "patients.view"],
  "exp": 1738281600
}
```

### Context Switching

**Cenário**: Médico trabalha em 3 clínicas diferentes

**Fluxo**:

1. Login inicial → Token com contexto da primeira clínica
2. Usuário seleciona outra clínica no dashboard
3. `POST /auth/switch-context { "clinic_id": "nova-clinica" }`
4. Sistema valida que user tem acesso à nova clínica
5. Novo token emitido com novo contexto

**Regras**:

- Só pode trocar para clínicas onde tem acesso
- Permissões podem mudar entre clínicas (via ClinicUser.custom_permissions)
- Histórico de switches auditado

---

## Cenários Suportados

### ✅ Cenário 1: Grupo Médico Multi-clínica

```
Organization: "Cardio Group"
  ├─ Clinic: "Unidade Paulista"
  ├─ Clinic: "Unidade Vila Mariana"
  └─ Clinic: "Unidade Santo Amaro"

Doctor: "Dr. João Silva"
  └─ Atende nas 3 unidades com horários diferentes em cada uma

User: "Ana (recepcionista)"
  └─ Acesso às 3 clínicas com role "receptionist"
```

### ✅ Cenário 2: Médico Independente Multi-organização

```
Doctor: "Dra. Maria Santos"
  ├─ Organization A: "Clínica ABC"
  │   └─ Role: doctor
  └─ Organization B: "Hospital XYZ"
      └─ Role: manager

Implementação:
  - 2 registros em OrganizationUser (um por org)
  - User alterna entre organizações via context switching
```

### ✅ Cenário 3: Paciente Cross-Clinic

```
Patient: "Carlos Oliveira"
  └─ Organization: "Cardio Group"
      ├─ Visited: "Unidade Paulista" (2 consultas)
      ├─ Visited: "Unidade Vila Mariana" (1 consulta)
      └─ Visited: "Unidade Santo Amaro" (0 consultas)

PatientClinicHistory mantém registro independente por clínica
```

---

## Decisões Arquiteturais

### Paciente Único por Organização

**Decisão**: Mesmo telefone pode existir em organizações diferentes

**Razão**: Organizações são isoladas, não há compartilhamento de pacientes

**Implicação**: `UNIQUE (organization_id, phone)` em vez de `UNIQUE (phone)`

---

### Médico Separado de Usuário

**Decisão**: `Doctor` é entidade separada de `User`

**Razão**: Nem todo médico precisa acessar o sistema (alguns são apenas referenciados)

**Implicação**: `doctor.user_id` é opcional (nullable)

---

### Settings em Cascata

**Decisão**: Organization → Clinic (override de configurações)

**Exemplo**:

```
Organization settings: { "default_consultation_duration": 30 }
Clinic settings: { "default_consultation_duration": 45 } // override
```

**Implicação**: Sistema sempre verifica clinic settings primeiro, depois org settings

---

### Row-Level Security vs Application-Level

**Decisão**: Usar ambos (defesa em profundidade)

**Razão**:

- RLS: Camada extra de segurança, prevent mistakes
- Application: Performance, controle fino, flexibilidade

**Implicação**: Queries devem ser eficientes mesmo com policies ativas

---

## Questões em Aberto

### Granularidade de Permissões

- **Questão**: Até onde vamos na granularidade de permissões?
- **Contexto**: Balance entre flexibilidade e simplicidade
- **Decisão pendente**: Definir lista completa de permissões

---

## Documentação Relacionada

- [DATABASE.MD](./DATABASE.MD) - Event Store e schema do banco de dados
- AGGREGATES.md (próximo) - Definição de agregados e bounded contexts
- EVENTS.md (próximo) - Catálogo completo de eventos
- STATE_MACHINE.md (próximo) - Máquinas de estado do sistema
