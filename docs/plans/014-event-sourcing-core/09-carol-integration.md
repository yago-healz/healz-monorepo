# Fase 9: Carol Integration (IA Real)

## Objetivo

Substituir o mock de detecção de intenções por uma integração real com LLMs (OpenAI GPT-4 ou Anthropic Claude), permitindo processamento avançado de linguagem natural, contextualização e geração de respostas inteligentes.

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)
- ✅ Fase 4 concluída (Conversation Aggregate)
- ✅ Fase 5 concluída (Carol Mock) - será substituído

## Escopo

### O que será implementado

1. **LLM Client** - Cliente para OpenAI ou Claude
2. **Intent Detection com IA** - Detecção avançada de intenções
3. **Entity Extraction** - Extração de entidades (datas, nomes, etc.)
4. **Contextual Response Generation** - Respostas contextualizadas
5. **Conversation Memory** - Histórico de mensagens para contexto
6. **Function Calling** - Ações estruturadas (agendar, cancelar, etc.)
7. **Prompt Engineering** - Templates de prompts otimizados

### O que NÃO será implementado

- ❌ Fine-tuning de modelos (usar prompts apenas)
- ❌ RAG com base de conhecimento (futura iteração)
- ❌ Modelos locais (usar APIs cloud)
- ❌ Agentes multi-step complexos (manter simples)
- ❌ Análise de sentimento profunda (básico apenas)

## Arquitetura

```
┌─────────────────────────────────────────┐
│     Conversation Aggregate              │
│                                         │
│  MessageReceived Event                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│     CarolService                        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Conversation Context Builder   │   │
│  │  - Load history (last 10 msgs)  │   │
│  │  - Patient info                 │   │
│  │  - Clinic context               │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│               ▼                         │
│  ┌─────────────────────────────────┐   │
│  │  LLM Client (OpenAI/Claude)     │   │
│  │  - Detect intent                │   │
│  │  - Extract entities             │   │
│  │  - Generate response            │   │
│  │  - Function calling             │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│               ▼                         │
│  ┌─────────────────────────────────┐   │
│  │  Action Executor                │   │
│  │  - schedule_appointment()       │   │
│  │  - cancel_appointment()         │   │
│  │  - request_info()               │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## LLM Client

```typescript
// infrastructure/llm/llm-client.interface.ts

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
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

export interface ILLMClient {
  chat(messages: LLMMessage[], options?: LLMChatOptions): Promise<LLMResponse>;
}

export interface LLMChatOptions {
  temperature?: number;
  maxTokens?: number;
  functions?: LLMFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
}

export interface LLMFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}
```

### OpenAI Implementation

```typescript
// infrastructure/llm/openai-client.ts

import { OpenAI } from 'openai';

@Injectable()
export class OpenAIClient implements ILLMClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private readonly client: OpenAI;

  constructor(@Inject('LLM_CONFIG') private readonly config: any) {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async chat(messages: LLMMessage[], options?: LLMChatOptions): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.openai.model || 'gpt-4-turbo-preview',
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 500,
        functions: options?.functions,
        function_call: options?.functionCall as any,
      });

      const choice = response.choices[0];

      this.logger.log(`LLM response: ${response.usage?.total_tokens} tokens`);

      return {
        content: choice.message.content || '',
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

### Anthropic (Claude) Implementation

```typescript
// infrastructure/llm/anthropic-client.ts

import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicClient implements ILLMClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private readonly client: Anthropic;

  constructor(@Inject('LLM_CONFIG') private readonly config: any) {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  async chat(messages: LLMMessage[], options?: LLMChatOptions): Promise<LLMResponse> {
    try {
      // Separar system message
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await this.client.messages.create({
        model: this.config.anthropic.model || 'claude-3-5-sonnet-20241022',
        system: systemMessage,
        messages: conversationMessages,
        max_tokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
        tools: this.convertFunctionsToTools(options?.functions),
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';
      const toolUse = response.content.find((c: any) => c.type === 'tool_use') as any;

      return {
        content: textContent,
        functionCall: toolUse
          ? {
              name: toolUse.name,
              arguments: toolUse.input,
            }
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
        type: 'object',
        properties: fn.parameters,
        required: Object.keys(fn.parameters),
      },
    }));
  }
}
```

## Carol Intent Detector (Real)

```typescript
// infrastructure/carol/carol-intent-detector.service.ts

@Injectable()
export class CarolIntentDetector implements IIntentDetector {
  private readonly logger = new Logger(CarolIntentDetector.name);

  constructor(
    private readonly llmClient: ILLMClient,
    private readonly pool: Pool,
  ) {}

  async detectIntent(
    message: string,
    context?: ConversationContext,
  ): Promise<IntentDetection> {
    try {
      // Construir contexto da conversa
      const conversationHistory = await this.loadConversationHistory(
        context?.conversationId,
      );

      // Preparar mensagens para LLM
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message,
        },
      ];

      // Chamar LLM com function calling
      const response = await this.llmClient.chat(messages, {
        temperature: 0.3, // Baixo para detecção precisa
        maxTokens: 200,
        functions: this.getIntentFunctions(),
        functionCall: 'auto',
      });

      if (response.functionCall) {
        return {
          intent: response.functionCall.name,
          confidence: 0.95, // Alta confiança em function calls
          entities: response.functionCall.arguments,
        };
      }

      // Fallback: tentar extrair da resposta textual
      return this.parseIntentFromText(response.content);
    } catch (error) {
      this.logger.error(`Intent detection failed: ${error.message}`);
      // Fallback para unknown
      return { intent: 'unknown', confidence: 0.0 };
    }
  }

  async extractEntities(message: string, intent: string): Promise<Record<string, any>> {
    // Usar LLM para extrair entidades específicas
    const prompt = this.getEntityExtractionPrompt(message, intent);

    const response = await this.llmClient.chat([
      {
        role: 'system',
        content: 'You are an entity extraction assistant. Extract entities from user messages.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    try {
      return JSON.parse(response.content);
    } catch {
      return {};
    }
  }

  private getSystemPrompt(): string {
    return `Você é Carol, assistente virtual de uma clínica de saúde.

Sua função é entender as intenções dos pacientes e ajudá-los com:
- Agendamento de consultas
- Confirmação de consultas
- Cancelamento/reagendamento
- Informações sobre a clínica
- Encaminhamento para atendimento humano

Seja empática, clara e objetiva.

Analise a mensagem do paciente e identifique a intenção principal.`;
  }

  private getIntentFunctions(): LLMFunction[] {
    return [
      {
        name: 'schedule_appointment',
        description: 'Patient wants to schedule an appointment',
        parameters: {
          date: {
            type: 'string',
            description: 'Preferred date (YYYY-MM-DD or relative like "amanhã")',
          },
          time: {
            type: 'string',
            description: 'Preferred time (HH:MM)',
          },
          reason: {
            type: 'string',
            description: 'Reason for appointment',
          },
        },
      },
      {
        name: 'confirm_appointment',
        description: 'Patient is confirming their appointment',
        parameters: {},
      },
      {
        name: 'cancel_appointment',
        description: 'Patient wants to cancel their appointment',
        parameters: {
          reason: {
            type: 'string',
            description: 'Reason for cancellation',
          },
        },
      },
      {
        name: 'reschedule_appointment',
        description: 'Patient wants to reschedule their appointment',
        parameters: {
          newDate: {
            type: 'string',
            description: 'New preferred date',
          },
          newTime: {
            type: 'string',
            description: 'New preferred time',
          },
        },
      },
      {
        name: 'request_info',
        description: 'Patient is asking for information',
        parameters: {
          topic: {
            type: 'string',
            description: 'What they want to know about',
          },
        },
      },
      {
        name: 'request_human',
        description: 'Patient wants to talk to a human',
        parameters: {},
      },
      {
        name: 'greeting',
        description: 'Patient is greeting or starting conversation',
        parameters: {},
      },
    ];
  }

  private async loadConversationHistory(
    conversationId?: string,
  ): Promise<LLMMessage[]> {
    if (!conversationId) return [];

    const result = await this.pool.query(
      `
      SELECT sender_type, content
      FROM conversation_messages_view
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [conversationId],
    );

    return result.rows.reverse().map(row => ({
      role: row.sender_type === 'patient' ? 'user' : 'assistant',
      content: row.content,
    }));
  }

  private parseIntentFromText(text: string): IntentDetection {
    // Fallback parser simples
    const lowerText = text.toLowerCase();

    if (lowerText.includes('agendar') || lowerText.includes('marcar')) {
      return { intent: 'schedule_appointment', confidence: 0.7 };
    }

    if (lowerText.includes('confirmar')) {
      return { intent: 'confirm_appointment', confidence: 0.7 };
    }

    return { intent: 'unknown', confidence: 0.5 };
  }

  private getEntityExtractionPrompt(message: string, intent: string): string {
    return `Extract entities from this message: "${message}"
Intent: ${intent}

Return JSON with extracted entities. Example:
{ "date": "2026-02-15", "time": "14:00", "reason": "consulta de rotina" }`;
  }
}
```

## Carol Response Generator (Real)

```typescript
// infrastructure/carol/carol-response-generator.service.ts

@Injectable()
export class CarolResponseGenerator implements IResponseGenerator {
  private readonly logger = new Logger(CarolResponseGenerator.name);

  constructor(
    private readonly llmClient: ILLMClient,
    private readonly pool: Pool,
  ) {}

  async generateResponse(options: ResponseOptions): Promise<string> {
    try {
      // Carregar contexto da clínica
      const clinicContext = await this.loadClinicContext(options.context?.conversationId);

      // Preparar prompt contextualizado
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(clinicContext),
        },
      ];

      // Adicionar histórico se houver
      if (options.context?.messageHistory) {
        messages.push(
          ...options.context.messageHistory.map(msg => ({
            role: 'user' as const,
            content: msg,
          })),
        );
      }

      // Adicionar contexto da intenção
      const intentContext = this.buildIntentContext(options.intent, options.entities);
      messages.push({
        role: 'user',
        content: `Generate a response for intent: ${options.intent}\nContext: ${intentContext}`,
      });

      const response = await this.llmClient.chat(messages, {
        temperature: 0.8, // Mais criativo para respostas
        maxTokens: 300,
      });

      return response.content;
    } catch (error) {
      this.logger.error(`Response generation failed: ${error.message}`);
      return 'Desculpe, tive um problema. Pode tentar novamente?';
    }
  }

  async generateConfirmation(
    action: string,
    details: Record<string, any>,
  ): Promise<string> {
    const prompt = `Generate a friendly confirmation message for action: ${action}
Details: ${JSON.stringify(details)}

Keep it short, friendly, and include relevant details.`;

    const response = await this.llmClient.chat([
      {
        role: 'system',
        content: 'You are Carol, a helpful healthcare assistant.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return response.content;
  }

  async generateErrorMessage(error: string): Promise<string> {
    const errorMessages: Record<string, string> = {
      slot_not_available: 'Esse horário não está disponível. Posso sugerir outros horários?',
      invalid_date: 'Não consegui entender essa data. Pode tentar novamente?',
      appointment_not_found: 'Não encontrei nenhuma consulta agendada para você.',
    };

    return errorMessages[error] || 'Ops! Algo deu errado. Pode tentar novamente?';
  }

  private getSystemPrompt(clinicContext: any): string {
    return `Você é Carol, assistente virtual da ${clinicContext.clinicName}.

INFORMAÇÕES DA CLÍNICA:
- Nome: ${clinicContext.clinicName}
- Endereço: ${clinicContext.address}
- Telefone: ${clinicContext.phone}
- Horários: ${clinicContext.hours}

PERSONALIDADE:
- Seja empática e acolhedora
- Use linguagem natural e amigável
- Seja objetiva e clara
- Use emojis ocasionalmente (não exagere)

DIRETRIZES:
- Sempre confirme dados importantes (data, horário)
- Não invente informações que você não tem
- Se não souber, ofereça transferir para atendimento humano
- Mantenha conversas focadas em saúde`;
  }

  private async loadClinicContext(conversationId?: string): Promise<any> {
    if (!conversationId) {
      return {
        clinicName: 'Healz Clinic',
        address: 'Rua Exemplo, 123',
        phone: '(11) 9999-9999',
        hours: 'Seg-Sex 8h-18h',
      };
    }

    // Buscar dados reais da clínica
    const result = await this.pool.query(
      `
      SELECT c.name, c.address, c.phone
      FROM conversation_view cv
      JOIN clinics c ON c.id = cv.clinic_id
      WHERE cv.id = $1
      `,
      [conversationId],
    );

    if (result.rows.length === 0) return {};

    return {
      clinicName: result.rows[0].name,
      address: result.rows[0].address,
      phone: result.rows[0].phone,
      hours: 'Seg-Sex 8h-18h', // TODO: adicionar à tabela clinics
    };
  }

  private buildIntentContext(intent: string, entities?: Record<string, any>): string {
    let context = `Intent: ${intent}`;

    if (entities) {
      context += `\nEntities: ${JSON.stringify(entities)}`;
    }

    return context;
  }
}
```

## Configuration

```typescript
// config/llm.config.ts

export const llmConfig = {
  provider: process.env.LLM_PROVIDER || 'openai', // 'openai' | 'anthropic'

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: 500,
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: 500,
  },

  // Caching
  cache: {
    enabled: true,
    ttl: 60 * 60, // 1 hour
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerDay: 100000,
  },
};
```

## Module Configuration

```typescript
// carol.module.ts

@Module({
  providers: [
    // LLM Client
    {
      provide: 'ILLMClient',
      useFactory: (config: any) => {
        if (config.provider === 'openai') {
          return new OpenAIClient(config);
        } else if (config.provider === 'anthropic') {
          return new AnthropicClient(config);
        }
        throw new Error(`Unknown LLM provider: ${config.provider}`);
      },
      inject: ['LLM_CONFIG'],
    },

    // Intent Detector
    {
      provide: 'IIntentDetector',
      useClass: CarolIntentDetector,
    },

    // Response Generator
    {
      provide: 'IResponseGenerator',
      useClass: CarolResponseGenerator,
    },

    // Config
    {
      provide: 'LLM_CONFIG',
      useValue: llmConfig,
    },
  ],
  exports: ['IIntentDetector', 'IResponseGenerator'],
})
export class CarolModule {}
```

## Prompt Engineering Best Practices

### 1. Sistema de Prompts Estruturados

```typescript
export const CAROL_PROMPTS = {
  system: {
    base: `Você é Carol, assistente virtual de saúde...`,
    scheduling: `Você está ajudando o paciente a agendar uma consulta...`,
    confirmation: `Você está confirmando detalhes de uma consulta...`,
  },

  examples: [
    {
      user: 'Quero marcar uma consulta',
      assistant: 'Claro! Para qual dia você gostaria de agendar?',
    },
    {
      user: 'Amanhã de manhã',
      assistant: 'Perfeito! Temos horários disponíveis às 9h, 10h e 11h. Qual prefere?',
    },
  ],
};
```

### 2. Few-Shot Learning

```typescript
private buildPromptWithExamples(intent: string): string {
  const examples = CAROL_PROMPTS.examples
    .filter(ex => this.isRelevantToIntent(ex, intent))
    .map(ex => `User: ${ex.user}\nAssistant: ${ex.assistant}`)
    .join('\n\n');

  return `${CAROL_PROMPTS.system.base}\n\nExamples:\n${examples}\n\nNow respond:`;
}
```

## Cost Optimization

```typescript
// infrastructure/carol/carol-cost-optimizer.ts

@Injectable()
export class CarolCostOptimizer {
  private readonly cache = new Map<string, { response: string; timestamp: number }>();

  async getCachedOrGenerate(
    key: string,
    generator: () => Promise<string>,
    ttl = 3600,
  ): Promise<string> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      return cached.response;
    }

    const response = await generator();
    this.cache.set(key, { response, timestamp: Date.now() });

    return response;
  }

  // Usar modelo mais barato para tarefas simples
  selectModel(complexity: 'low' | 'medium' | 'high'): string {
    const models = {
      low: 'gpt-3.5-turbo', // Mais barato
      medium: 'gpt-4-turbo-preview',
      high: 'gpt-4', // Mais caro
    };

    return models[complexity];
  }
}
```

## Testes

### Testes do Intent Detector

```typescript
describe('CarolIntentDetector', () => {
  it('should detect schedule_appointment intent', async () => {
    const detector = new CarolIntentDetector(llmClient, pool);

    const result = await detector.detectIntent('Quero marcar uma consulta para amanhã');

    expect(result.intent).toBe('schedule_appointment');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.entities).toBeDefined();
  });

  it('should extract date entity', async () => {
    const detector = new CarolIntentDetector(llmClient, pool);

    const result = await detector.detectIntent('Pode me agendar para dia 15 às 14h');

    expect(result.entities?.date).toBeDefined();
    expect(result.entities?.time).toBe('14:00');
  });

  it('should handle conversational context', async () => {
    const context = {
      conversationId: 'conv-1',
      patientId: 'patient-1',
      messageHistory: ['Oi', 'Olá! Como posso ajudar?', 'Quero marcar consulta'],
    };

    const result = await detector.detectIntent('Para amanhã', context);

    expect(result.intent).toBe('schedule_appointment');
  });
});
```

### Testes do Response Generator

```typescript
describe('CarolResponseGenerator', () => {
  it('should generate contextual response', async () => {
    const generator = new CarolResponseGenerator(llmClient, pool);

    const response = await generator.generateResponse({
      intent: 'schedule_appointment',
      entities: { date: '2026-02-15', time: '14:00' },
    });

    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(10);
  });

  it('should include clinic context', async () => {
    const response = await generator.generateResponse({
      intent: 'request_info',
      context: { conversationId: 'conv-1' },
    });

    expect(response).toContain('Healz'); // Nome da clínica
  });
});
```

## Environment Variables

```bash
# .env

# LLM Provider
LLM_PROVIDER=openai  # ou 'anthropic'

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Cost limits
LLM_MAX_TOKENS_PER_DAY=100000
LLM_MAX_REQUESTS_PER_MINUTE=60
```

## Monitoring

```typescript
// application/services/llm-monitor.service.ts

@Injectable()
export class LLMMonitorService {
  async logUsage(usage: {
    conversationId: string;
    intent: string;
    tokensUsed: number;
    cost: number;
    latency: number;
  }): Promise<void> {
    // Log para analytics
    this.logger.log(`LLM Usage: ${JSON.stringify(usage)}`);

    // Salvar no banco para billing
    await this.pool.query(
      `INSERT INTO llm_usage_logs (conversation_id, intent, tokens_used, cost, latency)
       VALUES ($1, $2, $3, $4, $5)`,
      [usage.conversationId, usage.intent, usage.tokensUsed, usage.cost, usage.latency],
    );
  }

  async getDailyCost(): Promise<number> {
    const result = await this.pool.query(
      `SELECT SUM(cost) as total FROM llm_usage_logs WHERE created_at >= CURRENT_DATE`,
    );

    return parseFloat(result.rows[0].total || '0');
  }
}
```

## Checklist de Implementação

- [ ] Escolher provider (OpenAI ou Claude)
- [ ] Implementar LLM clients (OpenAI + Anthropic)
- [ ] Criar CarolIntentDetector com IA real
- [ ] Criar CarolResponseGenerator com IA real
- [ ] Implementar function calling para ações estruturadas
- [ ] Criar system prompts otimizados
- [ ] Implementar conversation memory/context
- [ ] Adicionar caching para reduzir custos
- [ ] Implementar rate limiting
- [ ] Criar testes unitários
- [ ] Criar testes de integração
- [ ] Validar custo por conversa
- [ ] Documentar prompts e best practices
- [ ] Setup monitoring e alertas

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Detecção de intenções avançada com LLMs
2. ✅ Extração de entidades contextualizadas
3. ✅ Geração de respostas naturais e empáticas
4. ✅ Function calling para ações estruturadas
5. ✅ Conversational memory funcionando
6. ✅ Cost optimization implementado
7. ✅ Monitoring e logging de uso
8. ✅ Mock completamente substituído

**Validação:**
1. Enviar "quero consulta amanhã 14h" → detecta intent + entidades corretas
2. Conversa multi-turn → mantém contexto entre mensagens
3. Mensagens ambíguas → IA pede clarificação apropriadamente
4. Custo médio por conversa < $0.10 (target)
5. Latência média < 2s (95th percentile)
6. Taxa de acerto de intent > 90%

## Cost Estimates (OpenAI GPT-4)

- **Input:** ~$0.03 / 1K tokens
- **Output:** ~$0.06 / 1K tokens
- **Média por mensagem:** 500 tokens input + 200 tokens output = $0.027
- **100 conversas/dia (10 mensagens cada):** ~$27/dia = $810/mês

**Otimizações:**
- Usar GPT-3.5 para tarefas simples: 10x mais barato
- Caching de respostas comuns: -30% custo
- Limitar tokens por resposta: -20% custo
- **Meta:** < $300/mês para 1000 conversas/dia
