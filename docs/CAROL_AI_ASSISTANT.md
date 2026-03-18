# Carol - Assistente Virtual IA

Documentação técnica da implementação da Carol, assistente virtual de IA para clínicas de saúde.

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo de Mensagem](#fluxo-de-mensagem)
4. [System Prompt](#system-prompt)
5. [Tools (Function Calling)](#tools-function-calling)
6. [Configuração da Carol](#configuração-da-carol)
7. [Fontes de Conhecimento](#fontes-de-conhecimento)
8. [Sessão e Histórico](#sessão-e-histórico)
9. [Detecção de Intenção](#detecção-de-intenção)
10. [Escalação](#escalação)
11. [Conversation Event Sourcing](#conversation-event-sourcing)
12. [Integrações Externas](#integrações-externas)
13. [Endpoints da API](#endpoints-da-api)
14. [Schema do Banco de Dados](#schema-do-banco-de-dados)
15. [Guia: Como Adicionar Novas Fontes de Conhecimento](#guia-como-adicionar-novas-fontes-de-conhecimento)
16. [Guia: Como Adicionar Novas Tools](#guia-como-adicionar-novas-tools)
17. [Guia: Como Debugar Respostas da Carol](#guia-como-debugar-respostas-da-carol)
18. [Status Atual e Limitações](#status-atual-e-limitações)

---

## Visão Geral

**Carol** é uma assistente conversacional para clínicas de saúde construída com:

| Componente | Tecnologia |
|---|---|
| Orquestração IA | LangChain (`@langchain/core`, `@langchain/openai`) |
| Modelo LLM | OpenAI GPT-4o-mini (configurável via env) |
| Framework API | NestJS |
| Persistência de conversas | Event Sourcing (CQRS) |
| Banco de dados | PostgreSQL (Drizzle ORM) |
| Fila de eventos | RabbitMQ |

### Módulos envolvidos

```
src/modules/carol/          → Configuração, chat, tools, FAQs, escalação
src/modules/conversation/   → Event sourcing de conversas
src/modules/clinic-settings/ → Dados da clínica (serviços, horários, etc.)
```

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (Web/Mobile)                       │
│                  POST /clinics/{id}/carol/chat                │
└─────────────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│               CarolChatController                             │
│        (JwtAuthGuard + IsClinicAdminGuard)                    │
└─────────────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│               CarolChatService                                │
│                                                               │
│  1. Carrega config (draft ou published)                       │
│  2. Monta system prompt (personalidade + regras)              │
│  3. Cria tools (6 disponíveis)                                │
│  4. Recupera histórico da sessão (in-memory)                  │
│  5. Executa loop de tool-calling via LangChain:               │
│     ┌──────────────────────────────────┐                      │
│     │  invoke(messages) → resposta     │                      │
│     │  Se tool_calls detectadas:       │                      │
│     │    → Executa cada tool           │                      │
│     │    → Adiciona resultados         │                      │
│     │    → Re-invoca modelo            │                      │
│     │  Repete até sem tool_calls       │                      │
│     └──────────────────────────────────┘                      │
│  6. Retorna resposta + sessionId + toolsUsed                  │
└─────────────────────────────┬────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
   │  6 Tools   │      │  Config     │      │ Conversation │
   │            │      │  Service    │      │ Event Store  │
   │ clinic_info│      │             │      │              │
   │ services   │      │ draft/      │      │ Append +     │
   │ schedule   │      │ published   │      │ Publish      │
   │ availability│     │             │      │              │
   │ appointment│      │             │      │              │
   └────────────┘      └─────────────┘      └──────────────┘
```

---

## Fluxo de Mensagem

**Arquivo principal:** `src/modules/carol/chat/carol-chat.service.ts`

### Passo a passo detalhado

```
Usuário envia: "Quero agendar para amanhã"
         │
         ▼
1. Controller recebe POST /clinics/{clinicId}/carol/chat
   Body: { message, version: "draft"|"published", sessionId? }
         │
         ▼
2. CarolChatService.processMessage(clinicId, dto)
   │
   ├─ 2a. Carrega configuração da Carol (nome, tom, traits, regras)
   │       via CarolConfigService.getConfigByVersion(clinicId, version)
   │
   ├─ 2b. Cria instância ChatOpenAI:
   │       { model: 'gpt-4o-mini', temperature: 0.7 }
   │
   ├─ 2c. Cria as 6 tools e faz model.bindTools(tools)
   │
   ├─ 2d. Monta system prompt com personalidade + regras
   │
   └─ 2e. Monta chain de mensagens:
          [SystemMessage(prompt), ...histórico, HumanMessage(input)]
         │
         ▼
3. Loop de tool-calling:
   │
   ├─ Invoca modelo: modelWithTools.invoke(messages)
   │
   ├─ Se resposta tem tool_calls:
   │   ├─ Executa CheckAvailabilityTool({ date: "2026-03-19" })
   │   │   → Retorna slots disponíveis
   │   ├─ Executa GetServicesTool()
   │   │   → Retorna lista de serviços
   │   ├─ Cria ToolMessage para cada resultado
   │   └─ Re-invoca modelo com os resultados
   │
   └─ Se resposta NÃO tem tool_calls:
       → Resposta final gerada
         │
         ▼
4. Salva no histórico da sessão (HumanMessage + AIMessage)
         │
         ▼
5. Retorna ChatResponseDto:
   {
     reply: "Temos horários disponíveis amanhã: 09:00, 10:00...",
     sessionId: "uuid",
     toolsUsed: ["check_availability", "get_services"]
   }
```

---

## System Prompt

O system prompt é montado dinamicamente em `CarolChatService` com base na configuração da clínica.

### Estrutura do prompt

```
Você é {name}, assistente virtual de uma clínica de saúde.

DATA E HORA ATUAL: {data formatada no timezone da clínica}

PERSONALIDADE:
- Tom de voz: {formal | informal | empathetic}
- Traços: {welcoming, empathetic, professional, ...}

SAUDAÇÃO: {mensagem customizada de greeting}

DIRETRIZES:
- Responda sempre em português brasileiro
- Seja objetiva e clara (máximo 2-3 frases)
- Não invente informações — use as tools disponíveis
- Ofereça transferência para atendimento humano se necessário
{Se restrict_sensitive_topics: "Não discuta temas sensíveis"}

AGENDAMENTO:
{Regras de agendamento da config: confirmação, cancelamento, etc.}
```

### O que influencia a resposta

| Fator | Origem | Impacto |
|---|---|---|
| Nome da assistente | `clinic_carol_settings.name` | Identidade nas respostas |
| Tom de voz | `clinic_carol_settings.voice_tone` | Formalidade da linguagem |
| Traços de personalidade | `clinic_carol_settings.selected_traits` | Comportamento e estilo |
| Saudação | `clinic_carol_settings.greeting` | Primeira interação |
| Restrição de tópicos | `clinic_carol_settings.restrict_sensitive_topics` | Limita respostas sobre temas sensíveis |
| Regras de agendamento | `clinic_carol_settings.scheduling_rules` | Controla se Carol pode agendar/cancelar |
| Tools disponíveis | Código (6 tools) | Dados que a Carol pode acessar |
| Histórico da sessão | In-memory Map | Contexto da conversa |

---

## Tools (Function Calling)

As tools são o mecanismo pelo qual a Carol acessa dados reais da clínica. Cada tool é uma classe que estende `StructuredTool` do LangChain.

### Tools disponíveis

| Tool | Arquivo | Input | Dados retornados |
|---|---|---|---|
| `get_clinic_info` | `tools/get-clinic-info.tool.ts` | Nenhum | Nome, descrição, endereço da clínica |
| `get_services` | `tools/get-services.tool.ts` | Nenhum | Serviços com nome, duração, valor |
| `get_operating_hours` | `tools/get-operating-hours.tool.ts` | Nenhum | Horários de funcionamento por dia |
| `check_availability` | `tools/check-availability.tool.ts` | `{ date: "YYYY-MM-DD" }` | Slots disponíveis na data (cruza agenda + Google Calendar + bloqueios) |
| `create_appointment` | `tools/create-appointment.tool.ts` | `{ date, time, patientName, service? }` | Confirmação do agendamento (**MOCK no MVP**) |
| `get_payment_methods` | `tools/get-payment-methods.tool.ts` | Nenhum | Formas de pagamento ativas (tipo, nome, instruções) |

### Como o model decide usar tools

1. O modelo recebe a lista de tools com nome, descrição e schema de parâmetros
2. Baseado na mensagem do usuário, o modelo decide quais tools chamar
3. A decisão é feita pelo próprio GPT-4o-mini via function calling nativo
4. O LangChain gerencia o loop de execução e re-invocação

### Anatomia de uma tool

```typescript
// tools/get-services.tool.ts
export class GetServicesTool extends StructuredTool {
  name = 'get_services';
  description = 'Lista os serviços oferecidos pela clínica com valores e duração';
  schema = z.object({});  // Zod schema para validação do input

  constructor(private clinicSettingsService: ClinicSettingsService, private clinicId: string) {
    super();
  }

  async _call(_input: z.infer<typeof this.schema>): Promise<string> {
    // Busca dados no banco
    const services = await this.clinicSettingsService.getServices(this.clinicId);
    // Retorna como JSON string para o modelo interpretar
    return JSON.stringify({ services });
  }
}
```

### Loop de execução das tools

```typescript
// Em carol-chat.service.ts
let response = await modelWithTools.invoke(messages);

while (response.tool_calls && response.tool_calls.length > 0) {
  for (const toolCall of response.tool_calls) {
    const tool = toolMap[toolCall.name];
    try {
      const result = await tool.invoke(toolCall.args);
      messages.push(new ToolMessage({ content: result, tool_call_id: toolCall.id }));
    } catch (error) {
      messages.push(new ToolMessage({
        content: JSON.stringify({ error: error.message }),
        tool_call_id: toolCall.id
      }));
    }
  }
  response = await modelWithTools.invoke(messages);
}
```

---

## Configuração da Carol

### Padrão Draft/Published

A Carol usa um sistema de rascunho (draft) e publicação para que admins possam testar mudanças antes de ativá-las:

```
Admin edita config → Salva como DRAFT → Testa no chat (version=draft)
                                              ↓
                                     Satisfeito? → PUBLICA
                                              ↓
                                     Chat produção usa version=published
```

### Campos de configuração

**Tabela:** `clinic_carol_settings`

| Campo | Tipo | Default | Descrição |
|---|---|---|---|
| `name` | varchar(100) | `'Carol'` | Nome da assistente |
| `selected_traits` | jsonb | `[]` | Traços: welcoming, empathetic, professional, etc. |
| `voice_tone` | varchar(20) | `'empathetic'` | Tom: formal, informal, empathetic |
| `greeting` | text | `''` | Mensagem de saudação customizada |
| `restrict_sensitive_topics` | boolean | `true` | Restringe temas sensíveis |
| `scheduling_rules` | jsonb | `{}` | Regras de agendamento |
| `status` | varchar(20) | `'draft'` | draft ou published |
| `published_at` | timestamp | null | Data da última publicação |

### Regras de agendamento

```typescript
interface SchedulingRules {
  confirmBeforeScheduling?: boolean;    // Confirmar antes de agendar
  allowCancellation?: boolean;          // Permitir cancelar via bot
  allowRescheduling?: boolean;          // Permitir reagendar via bot
  postSchedulingMessage?: string;       // Mensagem após agendamento
}
```

**Serviço:** `src/modules/carol/carol-config.service.ts`

---

## Fontes de Conhecimento

### Fontes ativas (via tools)

| Fonte | Como é acessada | Dados |
|---|---|---|
| Informações da clínica | `GetClinicInfoTool` → `clinics` + `addresses` | Nome, descrição, endereço |
| Serviços | `GetServicesTool` → `clinic_services.services` (jsonb) | Nome, duração, valor |
| Horários de funcionamento | `GetOperatingHoursTool` → `clinic_scheduling.weekly_schedule` | Agenda semanal |
| Disponibilidade | `CheckAvailabilityTool` → Agenda + Google Calendar + bloqueios | Slots livres por data |
| Formas de pagamento | `GetPaymentMethodsTool` → `payment_methods` | Tipo, nome, instruções (apenas ativos) |

### Fontes cadastradas mas NÃO integradas

| Fonte | Status | O que falta |
|---|---|---|
| **FAQs** (`clinic_carol_faqs`) | CRUD pronto, **não usado no chat** | Injetar no system prompt ou criar RAG pipeline |
| **Escalation Triggers** (`clinic_escalation_triggers`) | CRUD pronto, **não avaliado no chat** | Avaliar condições durante processamento |

### Como a Carol obtém informações

```
Pergunta do usuário
       │
       ▼
  GPT-4o-mini analisa a pergunta
       │
       ├─ Precisa de dados da clínica? → Chama tool adequada
       │   └─ Tool busca no banco → Retorna JSON → Modelo interpreta
       │
       └─ Pode responder diretamente? → Responde com base no system prompt
           (personalidade, diretrizes, regras)
```

> **IMPORTANTE:** A Carol NÃO inventa informações. Ela só sabe o que está no system prompt e o que as tools retornam. Se uma pergunta não pode ser respondida pelas tools disponíveis, ela deve oferecer transferência para atendimento humano.

---

## Sessão e Histórico

### Armazenamento atual: In-Memory

```typescript
// carol-chat.service.ts
private sessions = new Map<string, BaseMessage[]>();
```

| Aspecto | Detalhe |
|---|---|
| Chave | `sessionId` (UUID gerado ou fornecido pelo client) |
| Valor | Array de `BaseMessage` (HumanMessage + AIMessage) |
| Persistência | **Apenas em memória** — perdido ao reiniciar servidor |
| Limite | Sem limite definido (potencial memory leak) |

### Fluxo da sessão

1. Client envia `sessionId` (ou recebe um novo se não enviar)
2. Service recupera histórico: `this.sessions.get(sessionId)`
3. Monta chain: `[SystemMessage, ...histórico, HumanMessage]`
4. Após resposta, salva: `history.push(HumanMessage, AIMessage)`

### Implicação para respostas

O histórico da sessão é o que permite à Carol manter contexto multi-turno. Sem ele, cada mensagem seria independente. Isso explica por que:
- Reiniciar o servidor perde todo o contexto de conversas
- Sessões diferentes não compartilham contexto
- O sistema não lembra conversas anteriores de um mesmo paciente

---

## Detecção de Intenção

### Implementação atual: Mock com Regex

**Arquivos:**
- `src/modules/carol/domain/intent-detector.interface.ts` — Interface
- `src/modules/carol/infrastructure/mock-intent-detector.service.ts` — Implementação mock
- `src/modules/carol/infrastructure/intent-patterns.ts` — Padrões regex

### Intenções definidas

| Intent | Confiança base | Exemplos de gatilho |
|---|---|---|
| `schedule_appointment` | 0.85 | "agendar", "marcar consulta" |
| `confirm_appointment` | 0.90 | "confirmar", "confirmo" |
| `cancel_appointment` | 0.85 | "cancelar", "desmarcar" |
| `reschedule_appointment` | 0.80 | "reagendar", "mudar horário" |
| `request_info` | 0.70 | "informação", "como funciona" |
| `request_human` | 0.95 | "atendente", "falar com humano" |
| `greeting` | 0.95 | "olá", "bom dia" |
| `goodbye` | 0.90 | "tchau", "até logo" |

### Processamento

```typescript
// Normalização do texto
normalize(text): remove acentos, lowercase, trim

// Detecção
detectIntent(message, context?):
  1. Normaliza mensagem
  2. Testa cada padrão regex
  3. Conta keyword matches
  4. Calcula score: (matches × confidence + keywords × 0.5) / total
  5. Retorna: { intent, confidence, entities }
```

> **Nota:** A detecção de intenção é usada no módulo de Conversation (event sourcing), não diretamente no chat da Carol. O chat usa o function calling nativo do OpenAI para decidir ações.

---

## Escalação

### Triggers definidos

**Tabela:** `clinic_escalation_triggers`

| Tipo de condição | Parâmetros | Descrição |
|---|---|---|
| `out_of_scope` | — | Tópico fora do escopo da Carol |
| `keyword_detected` | `{ keywords: string[] }` | Keywords específicas detectadas |
| `max_attempts_exceeded` | `{ maxAttempts: number }` | N tentativas sem resolução |
| `explicit_request` | — | Usuário pede atendimento humano |
| `custom` | `{ prompt: string }` | Condição customizada |

### Status de integração

Os triggers são gerenciados via CRUD mas **ainda não são avaliados durante o processamento do chat**. A avaliação precisaria ser adicionada no loop de `CarolChatService.processMessage()`.

---

## Conversation Event Sourcing

### Aggregate: Conversation

**Arquivo:** `src/modules/conversation/domain/conversation.aggregate.ts`

**Estados da conversa:**
```
active → escalated → resolved
  │                     ↑
  └─── abandoned ───────┘
```

### Eventos

| Evento | Dados | Quando |
|---|---|---|
| `ConversationStartedEvent` | patient_id, clinic_id, channel | Nova conversa iniciada |
| `MessageReceivedEvent` | from_phone, content, type | Mensagem recebida do paciente |
| `MessageSentEvent` | to_phone, content, sent_by | Mensagem enviada (bot/agent/system) |
| `IntentDetectedEvent` | intent, confidence, entities | Intenção detectada |
| `ConversationEscalatedEvent` | reason, escalated_to | Conversa escalada para humano |

### Projeções

**Tabelas de leitura:**
- `conversation_view` — Estado atual da conversa (status, canal, mensagem count)
- `message_view` — Histórico de mensagens (direction, content, sent_by, intent)

---

## Integrações Externas

### OpenAI

| Config | Valor |
|---|---|
| Variável de ambiente | `OPENAI_API_KEY` |
| Modelo | `OPENAI_MODEL` (default: `gpt-4o-mini`) |
| Temperature | `0.7` |
| Lib | `@langchain/openai` → `ChatOpenAI` |

### Google Calendar

**Usado por:** `CheckAvailabilityTool`

**Fluxo OAuth:**
1. Admin conecta Google Calendar via OAuth
2. Tokens encriptados (AES-256-GCM) salvos em `clinic_google_calendar_credentials`
3. Tool consulta free/busy slots via Google Calendar API
4. Slots ocupados são removidos da disponibilidade

**Serviço:** `GoogleCalendarService`

---

## Endpoints da API

### Chat

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/clinics/{clinicId}/carol/chat` | Enviar mensagem e receber resposta |

**Request:**
```json
{
  "message": "Quero agendar uma consulta",
  "version": "draft",
  "sessionId": "uuid-opcional"
}
```

**Response:**
```json
{
  "reply": "Claro! Para qual data você gostaria...",
  "sessionId": "uuid-gerado-ou-existente",
  "toolsUsed": ["check_availability"]
}
```

### Configuração

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clinics/{clinicId}/carol/config` | Obter config draft |
| `PUT` | `/clinics/{clinicId}/carol/config` | Salvar config draft |
| `POST` | `/clinics/{clinicId}/carol/config/publish` | Publicar draft |
| `GET` | `/clinics/{clinicId}/carol/config/published` | Obter config publicada |

### FAQs

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clinics/{clinicId}/carol/faqs` | Listar FAQs |
| `POST` | `/clinics/{clinicId}/carol/faqs` | Criar FAQ |
| `PATCH` | `/clinics/{clinicId}/carol/faqs/{faqId}` | Atualizar FAQ |
| `DELETE` | `/clinics/{clinicId}/carol/faqs/{faqId}` | Deletar FAQ |

### Escalation Triggers

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clinics/{clinicId}/carol/escalation-triggers` | Listar triggers |
| `POST` | `/clinics/{clinicId}/carol/escalation-triggers` | Criar trigger |
| `PATCH` | `/clinics/{clinicId}/carol/escalation-triggers/{triggerId}` | Atualizar trigger |
| `DELETE` | `/clinics/{clinicId}/carol/escalation-triggers/{triggerId}` | Deletar trigger |

### Conversas

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/conversations/receive` | Receber mensagem do paciente |
| `GET` | `/conversations/{id}` | Detalhes da conversa |
| `GET` | `/conversations/{id}/messages` | Histórico de mensagens |
| `GET` | `/conversations` | Listar conversas |

---

## Schema do Banco de Dados

### clinic_carol_settings

```sql
id              UUID PRIMARY KEY
clinic_id       UUID REFERENCES clinics(id)
name            VARCHAR(100) DEFAULT 'Carol'
selected_traits JSONB DEFAULT '[]'
voice_tone      VARCHAR(20) DEFAULT 'empathetic'
greeting        TEXT DEFAULT ''
restrict_sensitive_topics BOOLEAN DEFAULT true
scheduling_rules JSONB DEFAULT '{}'
status          VARCHAR(20) DEFAULT 'draft'    -- draft | published
published_at    TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP
```

### clinic_carol_faqs

```sql
id          UUID PRIMARY KEY
clinic_id   UUID REFERENCES clinics(id)
question    TEXT NOT NULL
answer      TEXT NOT NULL
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP
```

### clinic_escalation_triggers

```sql
id               UUID PRIMARY KEY
clinic_id        UUID REFERENCES clinics(id)
name             VARCHAR(150) NOT NULL
description      TEXT
condition_type   VARCHAR(50) NOT NULL    -- out_of_scope | keyword_detected | ...
condition_params JSONB DEFAULT '{}'
is_active        BOOLEAN DEFAULT true
created_at       TIMESTAMP DEFAULT NOW()
updated_at       TIMESTAMP
```

### conversation_view / message_view

```sql
-- conversation_view
id, patient_id, tenant_id, clinic_id (UUID)
status          VARCHAR(20)  -- active | escalated | resolved | abandoned
channel         VARCHAR(20)  -- whatsapp | web | sms
is_escalated    BOOLEAN
message_count   INTEGER
last_message_at TIMESTAMP

-- message_view
id, conversation_id (UUID)
direction       VARCHAR(10)  -- incoming | outgoing
content         TEXT
sent_by         VARCHAR(20)  -- bot | agent | system | patient
intent          VARCHAR(50)
intent_confidence DECIMAL
```

---

## Guia: Como Adicionar Novas Fontes de Conhecimento

### Opção 1: Injetar no System Prompt (simples)

Para informações estáticas ou semi-estáticas (ex: FAQs, políticas):

1. **Buscar dados** no `CarolChatService.processMessage()`, antes de montar o prompt
2. **Adicionar seção** no system prompt:

```typescript
// Em carol-chat.service.ts, no método processMessage()
const faqs = await this.faqService.list(clinicId);

const faqSection = faqs.length > 0
  ? `\n\nPERGUNTAS FREQUENTES:\n${faqs.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')}`
  : '';

const systemPrompt = `${basePrompt}${faqSection}`;
```

**Prós:** Simples, rápido de implementar
**Contras:** Limitado pelo context window do modelo; não escala com muitos FAQs

### Opção 2: Criar uma Nova Tool (dinâmico)

Para dados que precisam de parâmetros ou busca específica:

1. Criar arquivo em `src/modules/carol/tools/`
2. Extender `StructuredTool` do LangChain
3. Definir `name`, `description`, `schema` e `_call()`
4. Registrar no array de tools em `CarolChatService`

```typescript
// tools/search-faqs.tool.ts
export class SearchFaqsTool extends StructuredTool {
  name = 'search_faqs';
  description = 'Busca nas perguntas frequentes da clínica por um tema específico';
  schema = z.object({
    query: z.string().describe('Tema ou palavra-chave para buscar'),
  });

  constructor(private faqService: FaqService, private clinicId: string) {
    super();
  }

  async _call(input: { query: string }): Promise<string> {
    const faqs = await this.faqService.search(this.clinicId, input.query);
    return JSON.stringify({ faqs });
  }
}
```

**Prós:** O modelo decide quando buscar; escalável
**Contras:** Requer implementação de busca (full-text ou semântica)

### Opção 3: RAG com Embeddings (avançado)

Para grandes volumes de documentos:

1. Gerar embeddings (OpenAI `text-embedding-3-small`) para documentos
2. Armazenar em banco vetorial (pgvector no PostgreSQL)
3. Na hora do chat, fazer busca semântica nos documentos relevantes
4. Injetar resultados no prompt como contexto

**Prós:** Escala para milhares de documentos
**Contras:** Mais complexo; custo de embeddings; precisa de pgvector

---

## Guia: Como Adicionar Novas Tools

### Passo a passo

1. **Criar o arquivo da tool** em `src/modules/carol/tools/`:

```typescript
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class MinhaNovaToolTool extends StructuredTool {
  name = 'minha_nova_tool';
  description = 'Descrição clara do que a tool faz (em português)';
  schema = z.object({
    parametro: z.string().describe('Descrição do parâmetro'),
  });

  constructor(
    private meuService: MeuService,
    private clinicId: string,
  ) {
    super();
  }

  async _call(input: { parametro: string }): Promise<string> {
    const resultado = await this.meuService.metodo(this.clinicId, input.parametro);
    return JSON.stringify(resultado);
  }
}
```

2. **Registrar no `CarolChatService`**, no método que cria as tools:

```typescript
const tools = [
  new GetClinicInfoTool(this.clinicSettingsService, clinicId),
  new GetServicesTool(this.clinicSettingsService, clinicId),
  // ... tools existentes
  new MinhaNovaToolTool(this.meuService, clinicId),  // ← Nova tool
];
```

3. **Injetar dependência** no construtor do `CarolChatService` se necessário

4. **Testar** via endpoint de chat com `version: "draft"`

### Boas práticas para tools

- **Descrição clara:** O modelo decide usar a tool baseado na `description`. Seja específico.
- **Schema preciso:** Use `.describe()` em cada campo do Zod schema para o modelo entender os parâmetros.
- **Retorno JSON:** Sempre retorne `JSON.stringify()` para o modelo interpretar.
- **Tratamento de erro:** Retorne erros como JSON, não lance exceções (o loop já captura, mas é mais limpo).
- **Escopo mínimo:** Cada tool deve fazer uma coisa bem. Prefira várias tools simples a uma complexa.

---

## Guia: Como Debugar Respostas da Carol

### Por que a Carol respondeu X?

1. **Verifique o system prompt** — A personalidade, regras e restrições influenciam diretamente
2. **Verifique as tools usadas** — O campo `toolsUsed` na resposta mostra quais tools foram chamadas
3. **Verifique os dados retornados pelas tools** — Os logs do servidor mostram inputs e outputs de cada tool
4. **Verifique o histórico da sessão** — O contexto acumulado influencia respostas posteriores
5. **Verifique a configuração** — Draft vs Published podem ter configs diferentes

### Logs disponíveis

O `CarolChatService` usa `Logger` do NestJS com logs em cada etapa:
- Início do processamento (clinicId, sessionId)
- Config carregada
- Cada tool invocada (nome, input, output)
- Resposta final

### Teste isolado

Use o endpoint de chat com `version: "draft"` para testar mudanças sem afetar produção:

```bash
curl -X POST http://localhost:3001/api/v1/clinics/{clinicId}/carol/chat \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"message": "sua pergunta", "version": "draft"}'
```

---

## Status Atual e Limitações

### Implementado

- Chat com LangChain + OpenAI GPT-4o-mini
- 6 tools funcionais (clinic info, services, schedule, availability, appointment mock, payment methods)
- Sessão in-memory com histórico de conversa
- Configuração draft/published (personalidade, tom, regras)
- CRUD de FAQs e escalation triggers
- Event sourcing para conversas
- Integração Google Calendar para disponibilidade
- Suporte a timezone por clínica
- Detecção de intenção via regex (mock)

### Não implementado

| Feature | Descrição |
|---|---|
| **FAQs no chat** | FAQs cadastradas mas não integradas no prompt/RAG |
| **Avaliação de escalação** | Triggers definidos mas não avaliados durante chat |
| **Agendamento real** | `CreateAppointmentTool` é mock, não persiste no banco |
| **Sessão persistente** | Histórico perdido ao reiniciar servidor |
| **Detecção de intenção com LLM** | Usando regex mock, não OpenAI |
| **Embeddings/RAG** | Sem busca semântica em documentos |
| **Analytics** | Sem métricas de conversas/respostas |
| **Chat real-time** | Apenas REST, sem WebSocket |

### Dependências principais

| Pacote | Versão | Uso |
|---|---|---|
| `@langchain/core` | ^1.1.29 | Interfaces, mensagens, tools |
| `@langchain/openai` | ^1.2.11 | ChatOpenAI |
| `langchain` | — | Lib principal |
| `zod` | — | Validação de schemas nas tools |
| `googleapis` | — | Google Calendar API |
