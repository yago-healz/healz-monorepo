# Arquitetura do Healz

## Visão geral

Sistema event-driven que captura toda a jornada do paciente através de eventos imutáveis, processa através de máquinas de estado, toma decisões conversacionais com IA, e executa ações coordenadas.

## Stack tecnológica

### Backend

- **Runtime**: Node.js com NestJS + TypeScript
- **Banco de dados**: PostgreSQL
- **ORM**: Drizzle
- **Mensageria**: BullMQ + Redis
- **IA**: OpenAI SDK (decisões conversacionais)
- **WhatsApp**:

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

### 2. State Machine Engine

- **Propósito**: Gerenciar transições de estado na jornada do paciente
- **Estados principais**:
  - Novo contato → Agendamento → Confirmação → Consulta → Follow-up
- **Triggers**: Eventos capturados disparam transições

### 3. Decision Engine (LLM Integration)

- **Propósito**: Processar linguagem natural e tomar decisões conversacionais
- **Tech**: OpenAI SDK (integração direta, sem abstrações)
- **Escopo controlado**: Conversas bem definidas em contexto médico
- **Decisão**: API direta vs LangChain - optamos por controle e simplicidade

### 4. Action Orchestrator

- **Propósito**: Executar respostas do sistema (enviar mensagem, criar agendamento, etc)
- **Padrão**: Command pattern com filas
- **Tech**: BullMQ para jobs assíncronos

### 5. WhatsApp Gateway

- **Propósito**: Interface com Meta Cloud API
- **Decisão**: Meta Cloud API > Twilio
  - ✅ Custo menor
  - ✅ Menos restrições em templates
  - ✅ Integração nativa com Meta
- **Responsabilidade**: Apenas I/O, lógica fica no Decision Engine
