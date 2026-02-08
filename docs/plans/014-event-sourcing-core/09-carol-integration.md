# Fase 9: Carol Integration (IA Real)

## Objetivo

Substituir o mock de deteccao de intencoes por uma integracao real com LLMs (OpenAI GPT-4 ou Anthropic Claude), permitindo processamento avancado de linguagem natural, contextualizacao e geracao de respostas inteligentes.

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)
- Fase 4 concluida (Conversation Aggregate)
- Fase 5 concluida (Carol Mock) - sera substituido

## Escopo

### O que sera implementado

1. **LLM Client** - Cliente para OpenAI ou Claude
2. **Intent Detection com IA** - Deteccao avancada de intencoes
3. **Entity Extraction** - Extracao de entidades (datas, nomes, etc.)
4. **Contextual Response Generation** - Respostas contextualizadas
5. **Conversation Memory** - Historico de mensagens para contexto
6. **Function Calling** - Acoes estruturadas (agendar, cancelar, etc.)
7. **Prompt Engineering** - Templates de prompts otimizados

### O que NAO sera implementado

- Fine-tuning de modelos (usar prompts apenas)
- RAG com base de conhecimento (futura iteracao)
- Modelos locais (usar APIs cloud)
- Agentes multi-step complexos (manter simples)
- Analise de sentimento profunda (basico apenas)

## Arquitetura

```
+------------------------------------------+
|     Conversation Aggregate               |
|                                          |
|  MessageReceived Event                   |
+------------------+-----------------------+
                   |
                   v
+------------------------------------------+
|     CarolService                         |
|                                          |
|  +------------------------------------+  |
|  |  Conversation Context Builder      |  |
|  |  - Load history (last 10 msgs)     |  |
|  |  - Patient info                    |  |
|  |  - Clinic context                  |  |
|  +-------------------+----------------+  |
|                      |                    |
|                      v                    |
|  +------------------------------------+  |
|  |  LLM Client (OpenAI/Claude)        |  |
|  |  - Detect intent                   |  |
|  |  - Extract entities                |  |
|  |  - Generate response               |  |
|  |  - Function calling                |  |
|  +-------------------+----------------+  |
|                      |                    |
|                      v                    |
|  +------------------------------------+  |
|  |  Action Executor                   |  |
|  |  - schedule_appointment()          |  |
|  |  - cancel_appointment()            |  |
|  |  - request_info()                  |  |
|  +------------------------------------+  |
+------------------------------------------+
```

## Estrutura de Arquivos

```
apps/api/src/
+-- carol/
|   +-- carol.module.ts                  # Atualizar - trocar mock por real
|   +-- domain/
|   |   +-- intent-detector.interface.ts     # Ja existe (Fase 5)
|   |   +-- response-generator.interface.ts  # Ja existe (Fase 5)
|   |   +-- llm-client.interface.ts          # NOVO
|   +-- infrastructure/
|   |   +-- mock-intent-detector.service.ts      # Ja existe (Fase 5)
|   |   +-- mock-response-generator.service.ts   # Ja existe (Fase 5)
|   |   +-- openai-client.service.ts             # NOVO
|   |   +-- anthropic-client.service.ts          # NOVO
|   |   +-- carol-intent-detector.service.ts     # NOVO
|   |   +-- carol-response-generator.service.ts  # NOVO
|   |   +-- carol-prompts.ts                     # NOVO
|   |   +-- llm-config.ts                        # NOVO
```

## LLM Client Interface

```typescript
// domain/llm-client.interface.ts

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMFunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  functionCall?: LLMFunctionCall;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMChatOptions {
  temperature?: number;
  maxTokens?: number;
  functions?: LLMFunction[];
  functionCall?: "auto" | "none" | { name: string };
}

export interface LLMFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ILLMClient {
  chat(messages: LLMMessage[], options?: LLMChatOptions): Promise<LLMResponse>;
}
```

## Configuracao

```typescript
// infrastructure/llm-config.ts

export interface LLMConfig {
  provider: "openai" | "anthropic";
  openai: {
    apiKey: string;
    model: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
  maxTokens: number;
}

export function createLLMConfig(): LLMConfig {
  return {
    provider: (process.env.LLM_PROVIDER as any) || "openai",
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
    },
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "500"),
  };
}
```

## OpenAI Client

```typescript
// infrastructure/openai-client.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { OpenAI } from "openai";
import { ILLMClient, LLMMessage, LLMResponse, LLMChatOptions } from "../domain/llm-client.interface";
import { LLMConfig } from "./llm-config";

@Injectable()
export class OpenAIClient implements ILLMClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: LLMConfig) {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    this.model = config.openai.model;
  }

  async chat(messages: LLMMessage[], options?: LLMChatOptions): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        functions: options?.functions,
        function_call: options?.functionCall as any,
      });

      const choice = response.choices[0];

      this.logger.log(`LLM response: ${response.usage?.total_tokens} tokens`);

      return {
        content: choice.message.content || "",
        functionCall: choice.message.function_call
          ? {
              name: choice.message.function_call.name,
              arguments: JSON.parse(choice.message.function_call.arguments),
            }
          : undefined,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`LLM error: ${error.message}`, error.stack);
      throw new Error(`Failed to get LLM response: ${error.message}`);
    }
  }
}
```

## Anthropic (Claude) Client

```typescript
// infrastructure/anthropic-client.service.ts

import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { ILLMClient, LLMMessage, LLMResponse, LLMChatOptions, LLMFunction } from "../domain/llm-client.interface";
import { LLMConfig } from "./llm-config";

@Injectable()
export class AnthropicClient implements ILLMClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly config: LLMConfig) {
    this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
    this.model = config.anthropic.model;
  }

  async chat(messages: LLMMessage[], options?: LLMChatOptions): Promise<LLMResponse> {
    try {
      // Separar system message
      const systemMessage = messages.find(m => m.role === "system")?.content || "";
      const conversationMessages = messages
        .filter(m => m.role !== "system")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const response = await this.client.messages.create({
        model: this.model,
        system: systemMessage,
        messages: conversationMessages,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || 0.7,
        tools: this.convertFunctionsToTools(options?.functions),
      });

      const textContent = response.content.find((c: any) => c.type === "text");
      const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;

      return {
        content: textContent?.type === "text" ? textContent.text : "",
        functionCall: toolUse
          ? { name: toolUse.name, arguments: toolUse.input }
          : undefined,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logger.error(`LLM error: ${error.message}`, error.stack);
      throw error;
    }
  }

  private convertFunctionsToTools(functions?: LLMFunction[]): any[] {
    if (!functions) return [];

    return functions.map(fn => ({
      name: fn.name,
      description: fn.description,
      input_schema: {
        type: "object",
        properties: fn.parameters,
        required: Object.keys(fn.parameters),
      },
    }));
  }
}
```

## Carol Intent Detector (Real)

```typescript
// infrastructure/carol-intent-detector.service.ts

import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../db";
import { messageView } from "../../../db/schema/conversation-view.schema";
import { IIntentDetector, IntentDetection, ConversationContext } from "../domain/intent-detector.interface";
import { ILLMClient, LLMMessage, LLMFunction } from "../domain/llm-client.interface";
import { CAROL_PROMPTS } from "./carol-prompts";

@Injectable()
export class CarolIntentDetector implements IIntentDetector {
  private readonly logger = new Logger(CarolIntentDetector.name);

  constructor(
    @Inject("ILLMClient") private readonly llmClient: ILLMClient,
  ) {}

  async detectIntent(
    message: string,
    context?: ConversationContext,
  ): Promise<IntentDetection> {
    try {
      // Construir contexto da conversa
      const conversationHistory = context?.conversationId
        ? await this.loadConversationHistory(context.conversationId)
        : [];

      // Preparar mensagens para LLM
      const messages: LLMMessage[] = [
        { role: "system", content: CAROL_PROMPTS.system.intentDetection },
        ...conversationHistory,
        { role: "user", content: message },
      ];

      // Chamar LLM com function calling
      const response = await this.llmClient.chat(messages, {
        temperature: 0.3,
        maxTokens: 200,
        functions: this.getIntentFunctions(),
        functionCall: "auto",
      });

      if (response.functionCall) {
        return {
          intent: response.functionCall.name,
          confidence: 0.95,
          entities: response.functionCall.arguments,
        };
      }

      // Fallback: tentar extrair da resposta textual
      return this.parseIntentFromText(response.content);
    } catch (error) {
      this.logger.error(`Intent detection failed: ${error.message}`);
      return { intent: "unknown", confidence: 0.0 };
    }
  }

  async extractEntities(message: string, intent: string): Promise<Record<string, any>> {
    const response = await this.llmClient.chat([
      {
        role: "system",
        content: "You are an entity extraction assistant. Extract entities from user messages. Return JSON only.",
      },
      {
        role: "user",
        content: `Extract entities from: "${message}"\nIntent: ${intent}\nReturn JSON with extracted entities.`,
      },
    ], { temperature: 0.1, maxTokens: 200 });

    try {
      return JSON.parse(response.content);
    } catch {
      return {};
    }
  }

  private getIntentFunctions(): LLMFunction[] {
    return [
      {
        name: "schedule_appointment",
        description: "Patient wants to schedule an appointment",
        parameters: {
          date: { type: "string", description: "Preferred date (YYYY-MM-DD or relative)" },
          time: { type: "string", description: "Preferred time (HH:MM)" },
          reason: { type: "string", description: "Reason for appointment" },
        },
      },
      {
        name: "confirm_appointment",
        description: "Patient is confirming their appointment",
        parameters: {},
      },
      {
        name: "cancel_appointment",
        description: "Patient wants to cancel their appointment",
        parameters: {
          reason: { type: "string", description: "Reason for cancellation" },
        },
      },
      {
        name: "reschedule_appointment",
        description: "Patient wants to reschedule their appointment",
        parameters: {
          newDate: { type: "string", description: "New preferred date" },
          newTime: { type: "string", description: "New preferred time" },
        },
      },
      {
        name: "request_info",
        description: "Patient is asking for information",
        parameters: {
          topic: { type: "string", description: "What they want to know about" },
        },
      },
      {
        name: "request_human",
        description: "Patient wants to talk to a human",
        parameters: {},
      },
      {
        name: "greeting",
        description: "Patient is greeting or starting conversation",
        parameters: {},
      },
    ];
  }

  private async loadConversationHistory(conversationId: string): Promise<LLMMessage[]> {
    const messages = await db.select({
      direction: messageView.direction,
      content: messageView.content,
    })
      .from(messageView)
      .where(eq(messageView.conversationId, conversationId))
      .orderBy(desc(messageView.createdAt))
      .limit(10);

    return messages.reverse().map(msg => ({
      role: msg.direction === "incoming" ? "user" as const : "assistant" as const,
      content: msg.content,
    }));
  }

  private parseIntentFromText(text: string): IntentDetection {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("agendar") || lowerText.includes("marcar")) {
      return { intent: "schedule_appointment", confidence: 0.7 };
    }
    if (lowerText.includes("confirmar")) {
      return { intent: "confirm_appointment", confidence: 0.7 };
    }

    return { intent: "unknown", confidence: 0.5 };
  }
}
```

## Carol Response Generator (Real)

```typescript
// infrastructure/carol-response-generator.service.ts

import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { conversationView } from "../../../db/schema/conversation-view.schema";
import { IResponseGenerator, ResponseOptions } from "../domain/response-generator.interface";
import { ILLMClient, LLMMessage } from "../domain/llm-client.interface";
import { CAROL_PROMPTS } from "./carol-prompts";

@Injectable()
export class CarolResponseGenerator implements IResponseGenerator {
  private readonly logger = new Logger(CarolResponseGenerator.name);

  constructor(
    @Inject("ILLMClient") private readonly llmClient: ILLMClient,
  ) {}

  async generateResponse(options: ResponseOptions): Promise<string> {
    try {
      const messages: LLMMessage[] = [
        { role: "system", content: CAROL_PROMPTS.system.responseGeneration },
      ];

      // Adicionar historico se houver
      if (options.context?.messageHistory) {
        messages.push(
          ...options.context.messageHistory.map(msg => ({
            role: "user" as const,
            content: msg,
          })),
        );
      }

      // Adicionar contexto da intencao
      messages.push({
        role: "user",
        content: `Generate a response for intent: ${options.intent}\nEntities: ${JSON.stringify(options.entities || {})}`,
      });

      const response = await this.llmClient.chat(messages, {
        temperature: 0.8,
        maxTokens: 300,
      });

      return response.content;
    } catch (error) {
      this.logger.error(`Response generation failed: ${error.message}`);
      return "Desculpe, tive um problema. Pode tentar novamente?";
    }
  }

  async generateConfirmation(
    action: string,
    details: Record<string, any>,
  ): Promise<string> {
    const response = await this.llmClient.chat([
      {
        role: "system",
        content: "You are Carol, a helpful healthcare assistant. Generate short, friendly confirmation messages in Portuguese.",
      },
      {
        role: "user",
        content: `Generate a confirmation for action: ${action}\nDetails: ${JSON.stringify(details)}`,
      },
    ], { temperature: 0.7, maxTokens: 150 });

    return response.content;
  }

  async generateErrorMessage(error: string): Promise<string> {
    const errorMessages: Record<string, string> = {
      slot_not_available: "Esse horario nao esta disponivel. Posso sugerir outros horarios?",
      invalid_date: "Nao consegui entender essa data. Pode tentar novamente?",
      appointment_not_found: "Nao encontrei nenhuma consulta agendada para voce.",
    };

    return errorMessages[error] || "Ops! Algo deu errado. Pode tentar novamente?";
  }
}
```

## Prompts

```typescript
// infrastructure/carol-prompts.ts

export const CAROL_PROMPTS = {
  system: {
    intentDetection: `Voce e Carol, assistente virtual de uma clinica de saude.

Sua funcao e entender as intencoes dos pacientes e ajuda-los com:
- Agendamento de consultas
- Confirmacao de consultas
- Cancelamento/reagendamento
- Informacoes sobre a clinica
- Encaminhamento para atendimento humano

Analise a mensagem do paciente e identifique a intencao principal.
Use as funcoes disponiveis para estruturar sua resposta.`,

    responseGeneration: `Voce e Carol, assistente virtual de uma clinica de saude.

PERSONALIDADE:
- Seja empatica e acolhedora
- Use linguagem natural e amigavel
- Seja objetiva e clara
- Responda sempre em portugues brasileiro

DIRETRIZES:
- Sempre confirme dados importantes (data, horario)
- Nao invente informacoes que voce nao tem
- Se nao souber, ofereca transferir para atendimento humano
- Mantenha respostas curtas (maximo 2-3 frases)`,
  },
};
```

## Module Configuration

```typescript
// carol.module.ts (ATUALIZADO)

import { Module } from "@nestjs/common";
import { MockIntentDetector } from "./infrastructure/mock-intent-detector.service";
import { MockResponseGenerator } from "./infrastructure/mock-response-generator.service";
import { OpenAIClient } from "./infrastructure/openai-client.service";
import { AnthropicClient } from "./infrastructure/anthropic-client.service";
import { CarolIntentDetector } from "./infrastructure/carol-intent-detector.service";
import { CarolResponseGenerator } from "./infrastructure/carol-response-generator.service";
import { createLLMConfig } from "./infrastructure/llm-config";

const config = createLLMConfig();
const useMock = process.env.CAROL_MODE !== "llm";

@Module({
  providers: [
    // LLM Config
    { provide: "LLM_CONFIG", useValue: config },

    // LLM Client (only when not mock)
    ...(!useMock
      ? [
          {
            provide: "ILLMClient",
            useFactory: () => {
              if (config.provider === "anthropic") {
                return new AnthropicClient(config);
              }
              return new OpenAIClient(config);
            },
          },
        ]
      : []),

    // Intent Detector
    {
      provide: "IIntentDetector",
      useClass: useMock ? MockIntentDetector : CarolIntentDetector,
    },

    // Response Generator
    {
      provide: "IResponseGenerator",
      useClass: useMock ? MockResponseGenerator : CarolResponseGenerator,
    },
  ],
  exports: ["IIntentDetector", "IResponseGenerator"],
})
export class CarolModule {}
```

**Nota:** `CAROL_MODE=mock` usa implementacoes mock (Fase 5), `CAROL_MODE=llm` usa IA real.

## Variaveis de Ambiente

```bash
# .env

# Carol / LLM
CAROL_MODE=mock              # 'mock' | 'llm'
LLM_PROVIDER=openai          # 'openai' | 'anthropic'

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Limits
LLM_MAX_TOKENS=500
```

## Testes

### Testes do Intent Detector

```typescript
describe("CarolIntentDetector", () => {
  let detector: CarolIntentDetector;
  let mockLLMClient: ILLMClient;

  beforeEach(() => {
    // Mock LLM client para testes
    mockLLMClient = {
      chat: jest.fn().mockResolvedValue({
        content: "",
        functionCall: { name: "schedule_appointment", arguments: { date: "amanha" } },
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }),
    };
    detector = new CarolIntentDetector(mockLLMClient);
  });

  it("should detect schedule_appointment intent via function call", async () => {
    const result = await detector.detectIntent("Quero marcar uma consulta para amanha");

    expect(result.intent).toBe("schedule_appointment");
    expect(result.confidence).toBe(0.95);
    expect(result.entities?.date).toBe("amanha");
  });

  it("should fallback to text parsing when no function call", async () => {
    (mockLLMClient.chat as jest.Mock).mockResolvedValue({
      content: "O paciente quer agendar uma consulta",
      functionCall: undefined,
    });

    const result = await detector.detectIntent("Preciso de uma consulta");

    expect(result.intent).toBe("schedule_appointment");
    expect(result.confidence).toBe(0.7);
  });

  it("should return unknown on error", async () => {
    (mockLLMClient.chat as jest.Mock).mockRejectedValue(new Error("API error"));

    const result = await detector.detectIntent("Teste");

    expect(result.intent).toBe("unknown");
    expect(result.confidence).toBe(0.0);
  });
});
```

### Testes do Response Generator

```typescript
describe("CarolResponseGenerator", () => {
  let generator: CarolResponseGenerator;
  let mockLLMClient: ILLMClient;

  beforeEach(() => {
    mockLLMClient = {
      chat: jest.fn().mockResolvedValue({
        content: "Claro! Para qual dia voce gostaria de agendar?",
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
      }),
    };
    generator = new CarolResponseGenerator(mockLLMClient);
  });

  it("should generate response for intent", async () => {
    const response = await generator.generateResponse({
      intent: "schedule_appointment",
      entities: { date: "2026-02-15" },
    });

    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(10);
  });

  it("should return fallback on error", async () => {
    (mockLLMClient.chat as jest.Mock).mockRejectedValue(new Error("API error"));

    const response = await generator.generateResponse({ intent: "greeting" });

    expect(response).toContain("Desculpe");
  });

  it("should generate error message", async () => {
    const response = await generator.generateErrorMessage("slot_not_available");
    expect(response).toContain("disponivel");
  });
});
```

## Cost Estimates

- **GPT-4 Turbo:** ~$0.03/1K input tokens, ~$0.06/1K output tokens
- **Claude Sonnet:** ~$0.003/1K input tokens, ~$0.015/1K output tokens
- **Media por mensagem:** ~500 tokens input + 200 tokens output
- **Meta:** < $300/mes para 1000 conversas/dia

**Otimizacoes:**
- Usar modelo mais barato para tarefas simples (greetings, confirmations)
- Limitar historico de conversa a 10 mensagens
- Limitar max_tokens por resposta
- Caching de respostas para intencoes simples (future)

## Checklist de Implementacao

- [ ] Escolher provider (OpenAI ou Claude)
- [ ] Criar interface ILLMClient
- [ ] Implementar OpenAIClient
- [ ] Implementar AnthropicClient
- [ ] Criar CarolIntentDetector com IA real (queries Drizzle para historico)
- [ ] Criar CarolResponseGenerator com IA real
- [ ] Implementar function calling para acoes estruturadas
- [ ] Criar system prompts otimizados
- [ ] Atualizar CarolModule (trocar mock por real via env)
- [ ] Criar testes unitarios (com LLM client mockado)
- [ ] Validar custo por conversa
- [ ] Documentar prompts

## Resultado Esperado

1. Deteccao de intencoes avancada com LLMs
2. Extracao de entidades contextualizadas
3. Geracao de respostas naturais e empaticas
4. Function calling para acoes estruturadas
5. Conversational memory funcionando
6. Mock completamente substituido (via env var)
7. Todos os testes passando

**Validacao:**
1. Enviar "quero consulta amanha 14h" -> detecta intent + entidades corretas
2. Conversa multi-turn -> mantem contexto entre mensagens
3. Mensagens ambiguas -> IA pede clarificacao apropriadamente
4. Custo medio por conversa < $0.10 (target)
5. Latencia media < 2s (95th percentile)
6. Taxa de acerto de intent > 90%
