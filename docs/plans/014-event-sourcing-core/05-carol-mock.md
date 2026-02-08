# Fase 5: Carol Mock (IA Simulada)

## Objetivo

Criar uma implementação simulada de detecção de intenções e geração de respostas que permita testar o fluxo conversacional sem depender de APIs de IA reais (OpenAI/Claude).

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)

## Escopo

### O que será implementado

1. **Interface IIntentDetector** - Contrato para detecção de intenções
2. **MockIntentDetector** - Implementação com regex/keywords
3. **Interface IResponseGenerator** - Contrato para geração de respostas
4. **MockResponseGenerator** - Respostas pré-definidas
5. **Mapeamento de intenções** - Patterns básicos

### O que NÃO será implementado

- ❌ IA real com LLM (Fase 9)
- ❌ Aprendizado de máquina
- ❌ Contexto conversacional avançado
- ❌ Personalização por clínica

## Interfaces

### IIntentDetector

```typescript
// domain/intent-detector.interface.ts

export interface IntentDetection {
  intent: string;
  confidence: number; // 0.0 to 1.0
  entities?: Record<string, any>;
}

export interface IIntentDetector {
  /**
   * Detecta a intenção de uma mensagem
   */
  detectIntent(message: string, context?: ConversationContext): Promise<IntentDetection>;
  
  /**
   * Extrai entidades de uma mensagem
   */
  extractEntities(message: string, intent: string): Promise<Record<string, any>>;
}

export interface ConversationContext {
  conversationId: string;
  patientId: string;
  lastIntent?: string;
  messageHistory?: string[];
}
```

### IResponseGenerator

```typescript
// domain/response-generator.interface.ts

export interface ResponseOptions {
  intent: string;
  entities?: Record<string, any>;
  context?: ConversationContext;
  tone?: 'formal' | 'casual' | 'empathetic';
}

export interface IResponseGenerator {
  /**
   * Gera resposta baseada em intenção
   */
  generateResponse(options: ResponseOptions): Promise<string>;
  
  /**
   * Gera mensagem de confirmação
   */
  generateConfirmation(action: string, details: Record<string, any>): Promise<string>;
  
  /**
   * Gera mensagem de erro
   */
  generateErrorMessage(error: string): Promise<string>;
}
```

## Intent Patterns

```typescript
// infrastructure/mock-intent-detector/intent-patterns.ts

export interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  keywords: string[];
  confidence: number; // Base confidence
  entityExtractors?: Record<string, RegExp>;
}

export const INTENT_PATTERNS: IntentPattern[] = [
  // Agendamento
  {
    intent: 'schedule_appointment',
    patterns: [
      /\b(agendar|marcar|consulta|atendimento)\b/i,
      /\b(quero|preciso|gostaria).*(consulta|atendimento)\b/i,
      /\b(horário|disponível|vaga)\b.*\b(consulta|atendimento)\b/i,
    ],
    keywords: ['agendar', 'marcar', 'consulta', 'horário', 'disponível'],
    confidence: 0.85,
    entityExtractors: {
      date: /\b(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo|\d{1,2}\/\d{1,2})\b/i,
      time: /\b(\d{1,2}[h:]?\d{0,2})\b/i,
    },
  },
  
  // Confirmação
  {
    intent: 'confirm_appointment',
    patterns: [
      /\b(confirmar|confirmação|confirmo)\b/i,
      /\b(sim|ok|tudo bem|pode ser)\b.*\b(consulta|agendamento)\b/i,
    ],
    keywords: ['confirmar', 'confirmação', 'sim', 'ok'],
    confidence: 0.90,
  },
  
  // Cancelamento
  {
    intent: 'cancel_appointment',
    patterns: [
      /\b(cancelar|desmarcar)\b.*\b(consulta|agendamento)\b/i,
      /\b(não|nao).*(poder|consigo|vou conseguir)\b.*\b(consulta|ir)\b/i,
    ],
    keywords: ['cancelar', 'desmarcar', 'não posso'],
    confidence: 0.85,
  },
  
  // Reagendamento
  {
    intent: 'reschedule_appointment',
    patterns: [
      /\b(remarcar|reagendar|mudar).*(consulta|horário|data)\b/i,
      /\b(outro|outra).*(horário|data|dia)\b/i,
    ],
    keywords: ['remarcar', 'reagendar', 'mudar', 'outro horário'],
    confidence: 0.80,
  },
  
  // Informação
  {
    intent: 'request_info',
    patterns: [
      /\b(informação|info|saber|onde|como|quando|qual)\b/i,
      /\b(endereço|localização|telefone|contato)\b/i,
    ],
    keywords: ['informação', 'onde', 'como', 'endereço'],
    confidence: 0.70,
  },
  
  // Atendimento humano
  {
    intent: 'request_human',
    patterns: [
      /\b(falar|atendente|pessoa|humano)\b/i,
      /\b(preciso|quero).*(falar|conversar).*(alguém|pessoa)\b/i,
    ],
    keywords: ['atendente', 'pessoa', 'humano', 'falar'],
    confidence: 0.95,
  },
  
  // Saudação
  {
    intent: 'greeting',
    patterns: [
      /\b(oi|olá|ola|bom dia|boa tarde|boa noite|hey|alô)\b/i,
    ],
    keywords: ['oi', 'olá', 'bom dia', 'boa tarde'],
    confidence: 0.95,
  },
  
  // Despedida
  {
    intent: 'goodbye',
    patterns: [
      /\b(tchau|até logo|até|obrigado|valeu|bye)\b/i,
    ],
    keywords: ['tchau', 'até', 'obrigado'],
    confidence: 0.90,
  },
];
```

## Mock Intent Detector

```typescript
// infrastructure/mock-intent-detector/mock-intent-detector.service.ts

@Injectable()
export class MockIntentDetector implements IIntentDetector {
  private readonly logger = new Logger(MockIntentDetector.name);
  
  async detectIntent(
    message: string,
    context?: ConversationContext,
  ): Promise<IntentDetection> {
    const normalized = this.normalizeMessage(message);
    
    // Tentar match com patterns
    let bestMatch: IntentDetection = {
      intent: 'unknown',
      confidence: 0.0,
    };
    
    for (const pattern of INTENT_PATTERNS) {
      const confidence = this.calculateConfidence(normalized, pattern);
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          intent: pattern.intent,
          confidence,
          entities: await this.extractEntities(message, pattern.intent),
        };
      }
    }
    
    // Log para debug
    this.logger.log(`Intent detected (MOCK): ${bestMatch.intent} (${bestMatch.confidence.toFixed(2)})`);
    
    return bestMatch;
  }
  
  async extractEntities(message: string, intent: string): Promise<Record<string, any>> {
    const pattern = INTENT_PATTERNS.find(p => p.intent === intent);
    if (!pattern?.entityExtractors) return {};
    
    const entities: Record<string, any> = {};
    
    for (const [key, regex] of Object.entries(pattern.entityExtractors)) {
      const match = message.match(regex);
      if (match) {
        entities[key] = match[1];
      }
    }
    
    return entities;
  }
  
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .trim();
  }
  
  private calculateConfidence(message: string, pattern: IntentPattern): number {
    let score = 0;
    let matches = 0;
    
    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        matches++;
        score += pattern.confidence;
      }
    }
    
    // Check keywords
    const keywordMatches = pattern.keywords.filter(keyword =>
      message.includes(keyword.toLowerCase())
    );
    
    if (keywordMatches.length > 0) {
      matches++;
      score += pattern.confidence * 0.5;
    }
    
    // Normalize score
    if (matches === 0) return 0;
    return Math.min(score / matches, 1.0);
  }
}
```

## Mock Response Generator

```typescript
// infrastructure/mock-response-generator/mock-response-generator.service.ts

@Injectable()
export class MockResponseGenerator implements IResponseGenerator {
  private readonly logger = new Logger(MockResponseGenerator.name);
  
  private readonly responses: Record<string, string[]> = {
    greeting: [
      'Olá! 👋 Como posso ajudar você hoje?',
      'Oi! Bem-vindo à nossa clínica. Em que posso ajudar?',
      'Olá! Estou aqui para ajudar. O que você precisa?',
    ],
    
    schedule_appointment: [
      'Ótimo! Vou te ajudar a agendar uma consulta. Qual dia e horário você prefere?',
      'Perfeito! Para qual dia você gostaria de agendar?',
      'Vamos agendar sua consulta! Você tem preferência de dia e horário?',
    ],
    
    confirm_appointment: [
      '✅ Consulta confirmada com sucesso!',
      'Perfeito! Sua consulta está confirmada.',
      'Confirmado! Te esperamos no dia e horário agendados.',
    ],
    
    cancel_appointment: [
      'Entendi. Vou cancelar sua consulta. Confirma?',
      'Sem problemas! Quer cancelar a consulta?',
      'Tudo bem! Confirma o cancelamento da consulta?',
    ],
    
    reschedule_appointment: [
      'Vou te ajudar a remarcar. Qual o novo dia e horário?',
      'Sem problemas! Para quando você gostaria de reagendar?',
      'Ok! Qual seria o melhor dia e horário para você?',
    ],
    
    request_info: [
      'Sobre o que você gostaria de saber?',
      'Claro! Qual informação você precisa?',
      'Posso te ajudar com isso! O que você quer saber?',
    ],
    
    request_human: [
      'Vou transferir você para um atendente. Um momento, por favor! 👨‍⚕️',
      'Claro! Vou conectar você com nossa equipe.',
      'Entendo. Transferindo para atendimento humano...',
    ],
    
    goodbye: [
      'Até logo! Se precisar, estou aqui. 👋',
      'Tchau! Qualquer coisa é só chamar.',
      'Até mais! Tenha um ótimo dia! ☀️',
    ],
    
    unknown: [
      'Desculpe, não entendi. Pode reformular?',
      'Não compreendi. Pode explicar de outra forma?',
      'Hmm, não entendi bem. Você pode ser mais específico?',
    ],
  };
  
  async generateResponse(options: ResponseOptions): Promise<string> {
    const responses = this.responses[options.intent] || this.responses.unknown;
    
    // Seleciona resposta aleatória
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Substitui entidades se houver
    let finalResponse = response;
    if (options.entities) {
      finalResponse = this.injectEntities(response, options.entities);
    }
    
    this.logger.log(`Response generated (MOCK) for intent: ${options.intent}`);
    
    return finalResponse;
  }
  
  async generateConfirmation(
    action: string,
    details: Record<string, any>,
  ): Promise<string> {
    switch (action) {
      case 'appointment_scheduled':
        return `✅ Consulta agendada para ${details.date} às ${details.time} com ${details.doctor}!`;
      
      case 'appointment_cancelled':
        return `❌ Consulta do dia ${details.date} cancelada com sucesso.`;
      
      case 'appointment_rescheduled':
        return `🔄 Consulta reagendada para ${details.newDate} às ${details.newTime}!`;
      
      default:
        return '✅ Ação realizada com sucesso!';
    }
  }
  
  async generateErrorMessage(error: string): Promise<string> {
    const errorMessages: Record<string, string> = {
      slot_not_available: '😕 Desculpe, este horário não está disponível. Temos outras opções?',
      invalid_date: '📅 Esta data não é válida. Pode escolher outra?',
      past_date: '⏰ Não é possível agendar para datas passadas. Escolha uma data futura.',
      appointment_not_found: '🔍 Não encontrei nenhuma consulta agendada.',
      generic: 'Ops! Algo deu errado. Pode tentar novamente?',
    };
    
    return errorMessages[error] || errorMessages.generic;
  }
  
  private injectEntities(template: string, entities: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(entities)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    
    return result;
  }
}
```

## Module Configuration

```typescript
// carol.module.ts

@Module({
  providers: [
    {
      provide: 'IIntentDetector',
      useClass: MockIntentDetector,
    },
    {
      provide: 'IResponseGenerator',
      useClass: MockResponseGenerator,
    },
  ],
  exports: ['IIntentDetector', 'IResponseGenerator'],
})
export class CarolModule {}
```

## Testes

### Testes do Intent Detector

```typescript
describe('MockIntentDetector', () => {
  let detector: MockIntentDetector;
  
  beforeEach(() => {
    detector = new MockIntentDetector();
  });
  
  it('should detect schedule_appointment intent', async () => {
    const result = await detector.detectIntent('Quero marcar uma consulta');
    
    expect(result.intent).toBe('schedule_appointment');
    expect(result.confidence).toBeGreaterThan(0.7);
  });
  
  it('should detect greeting intent', async () => {
    const result = await detector.detectIntent('Oi, tudo bem?');
    
    expect(result.intent).toBe('greeting');
    expect(result.confidence).toBeGreaterThan(0.9);
  });
  
  it('should extract date entity', async () => {
    const result = await detector.detectIntent('Quero marcar para amanhã');
    
    expect(result.entities?.date).toBe('amanhã');
  });
  
  it('should return unknown for unrecognized message', async () => {
    const result = await detector.detectIntent('xpto abc 123');
    
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
  });
});
```

### Testes do Response Generator

```typescript
describe('MockResponseGenerator', () => {
  let generator: MockResponseGenerator;
  
  beforeEach(() => {
    generator = new MockResponseGenerator();
  });
  
  it('should generate response for intent', async () => {
    const response = await generator.generateResponse({
      intent: 'greeting',
    });
    
    expect(response).toContain('Olá');
  });
  
  it('should generate confirmation message', async () => {
    const response = await generator.generateConfirmation('appointment_scheduled', {
      date: '15/02',
      time: '14h',
      doctor: 'Dr. João',
    });
    
    expect(response).toContain('15/02');
    expect(response).toContain('14h');
    expect(response).toContain('Dr. João');
  });
  
  it('should generate error message', async () => {
    const response = await generator.generateErrorMessage('slot_not_available');
    
    expect(response).toContain('não está disponível');
  });
});
```

## Checklist de Implementação

- [ ] Criar interfaces (IIntentDetector, IResponseGenerator)
- [ ] Definir intent patterns
- [ ] Implementar MockIntentDetector
- [ ] Implementar MockResponseGenerator
- [ ] Configurar CarolModule
- [ ] Criar testes unitários
- [ ] Integrar com Conversation Aggregate (Fase 4)
- [ ] Validar detecção de intenções com mensagens reais
- [ ] Documentar intenções suportadas

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Detecção de intenções funcionando com regex/keywords
2. ✅ Geração de respostas pré-definidas
3. ✅ Extração básica de entidades (data, hora)
4. ✅ Suporte para 8+ intenções principais
5. ✅ Testes passando
6. ✅ Interface pronta para substituir por IA real (Fase 9)

**Validação:**
1. Enviar mensagem "Quero marcar consulta" → detecta schedule_appointment
2. Enviar mensagem "Oi" → detecta greeting
3. Enviar mensagem "Quero falar com atendente" → detecta request_human
4. Verificar extração de entidades (data, hora)
