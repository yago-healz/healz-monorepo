# Arquitetura do Healz

## Visão geral

Sistema event-driven que captura toda a jornada do paciente através de eventos imutáveis, processa através de máquinas de estado, toma decisões conversacionais com IA, e executa ações coordenadas.

## Stack tecnológica

### Backend

- **Runtime**: Node.js com NestJS + TypeScript
- **Banco de dados**: PostgreSQL
- **ORM**: Drizzle
- **Mensageria**: BullMQ + Redis
- **IA**: LangChain (orquestração de agentes e decisões conversacionais)
- **WhatsApp**: Evolution API (self-hosted, maior flexibilidade)

### Frontend (Dashboard Clínicas)

- **Framework**: React + Vite
- **State**: TanStack Query
- **UI**: ShadcnUI + Tailwind CSS

## Componentes principais

### 1. Event Store (PostgreSQL)

- **Propósito**: Armazenamento imutável de todos os eventos do sistema
- **Padrão**: Event Sourcing
- **Benefícios**:
  - Auditoria completa (essencial em saúde)
  - Reconstrução de estado a qualquer momento
  - Rastreabilidade da jornada do paciente
  - Base para detecção de padrões e risco

### 2. State Machine Engine

- **Propósito**: Gerenciar transições de estado na jornada do paciente
- **Estados principais**:
  - Novo contato → Agendamento → Confirmação → Consulta → Follow-up
  - Estados de risco: Em risco, Sumido, Retomado
- **Triggers**: Eventos capturados disparam transições
- **Persistência**: Estado atual materializado + histórico completo em eventos

### 3. Decision Engine (LangChain Integration)

- **Propósito**: Processar linguagem natural e tomar decisões conversacionais
- **Tech**: LangChain para orquestração de agentes
- **Responsabilidades**:
  - Interpretação de intenção do paciente
  - Decisão de resposta apropriada
  - Detecção de necessidade de escalação humana
  - Extração de informações para agendamento
- **Escopo controlado**: Conversas bem definidas em contexto médico

### 4. Action Orchestrator

- **Propósito**: Executar respostas do sistema (enviar mensagem, criar agendamento, etc)
- **Padrão**: Command pattern com filas
- **Tech**: BullMQ para jobs assíncronos
- **Tipos de ação**:
  - Envio de mensagens WhatsApp
  - Criação/atualização de agendamentos
  - Geração de alertas
  - Escalação para atendimento humano

### 5. WhatsApp Gateway (Evolution API)

- **Propósito**: Interface com Evolution API para comunicação WhatsApp
- **Vantagens da Evolution API**:
  - ✅ Open source e self-hosted
  - ✅ Sem restrições de templates
  - ✅ Maior flexibilidade e customização
  - ✅ Custo controlável
  - ✅ Já utilizado pela empresa
- **Responsabilidade**: Apenas I/O, lógica conversacional fica no Decision Engine

### 6. Risk Intelligence Engine

- **Propósito**: Detectar padrões de risco e abandono
- **Inputs**: Stream de eventos do paciente
- **Outputs**: Scores e alertas
- **Sinais analisados**:
  - Atrasos recorrentes
  - Silêncio prolongado
  - Mudança de tom/comportamento
  - Padrões de cancelamento
- **Ação**: Dispara eventos de risco que alimentam State Machine

## Fluxo de dados (simplificado)

```
WhatsApp (paciente)
  → Evolution API
  → Event Capture
  → Event Store
  → State Machine (transição de estado)
  → Decision Engine (LangChain decide resposta)
  → Action Orchestrator (executa ação)
  → WhatsApp (resposta ao paciente)
```

## Arquitetura Multi-tenant

- **Hierarquia**: Organization → Clinic → Doctor
- **Isolamento**: Row-Level Security (RLS) no PostgreSQL
- **Autenticação**: JWT com context switching para médicos multi-clínica
- **Permissões**: Role-based access control (RBAC)
