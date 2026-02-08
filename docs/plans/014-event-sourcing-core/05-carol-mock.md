# Fase 5: Carol Mock (IA Simulada)

## Objetivo

Criar uma implementacao simulada de deteccao de intencoes e geracao de respostas que permita testar o fluxo conversacional sem depender de APIs de IA reais (OpenAI/Claude).

## Pre-requisitos

- Fase 1 concluida (Event Store Foundation)

## Escopo

### O que sera implementado

1. **Interface IIntentDetector** - Contrato para deteccao de intencoes
2. **MockIntentDetector** - Implementacao com regex/keywords
3. **Interface IResponseGenerator** - Contrato para geracao de respostas
4. **MockResponseGenerator** - Respostas pre-definidas
5. **Mapeamento de intencoes** - Patterns basicos

### O que NAO sera implementado

- IA real com LLM (Fase 9)
- Aprendizado de maquina
- Contexto conversacional avancado
- Personalizacao por clinica

## Estrutura de Arquivos

```
apps/api/src/
+-- carol/
|   +-- carol.module.ts
|   +-- domain/
|   |   +-- intent-detector.interface.ts
|   |   +-- response-generator.interface.ts
|   +-- infrastructure/
|   |   +-- mock-intent-detector.service.ts
|   |   +-- mock-response-generator.service.ts
|   |   +-- intent-patterns.ts
```

## Interfaces

### IIntentDetector

```typescript
// domain/intent-detector.interface.ts

export interface IntentDetection {
  intent: string;
  confidence: number; // 0.0 to 1.0
  entities?: Record<string, any>;
}

export interface ConversationContext {
  conversationId: string;
  patientId: string;
  lastIntent?: string;
  messageHistory?: string[];
}

export interface IIntentDetector {
  detectIntent(message: string, context?: ConversationContext): Promise<IntentDetection>;
  extractEntities(message: string, intent: string): Promise<Record<string, any>>;
}
```

### IResponseGenerator

```typescript
// domain/response-generator.interface.ts

export interface ResponseOptions {
  intent: string;
  entities?: Record<string, any>;
  context?: ConversationContext;
  tone?: "formal" | "casual" | "empathetic";
}

export interface IResponseGenerator {
  generateResponse(options: ResponseOptions): Promise<string>;
  generateConfirmation(action: string, details: Record<string, any>): Promise<string>;
  generateErrorMessage(error: string): Promise<string>;
}
```

## Intent Patterns

```typescript
// infrastructure/intent-patterns.ts

export interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  keywords: string[];
  confidence: number;
  entityExtractors?: Record<string, RegExp>;
}

export const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "schedule_appointment",
    patterns: [
      /\b(agendar|marcar|consulta|atendimento)\b/i,
      /\b(quero|preciso|gostaria).*(consulta|atendimento)\b/i,
      /\b(horario|disponivel|vaga)\b.*\b(consulta|atendimento)\b/i,
    ],
    keywords: ["agendar", "marcar", "consulta", "horario", "disponivel"],
    confidence: 0.85,
    entityExtractors: {
      date: /\b(amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}\/\d{1,2})\b/i,
      time: /\b(\d{1,2}[h:]?\d{0,2})\b/i,
    },
  },
  {
    intent: "confirm_appointment",
    patterns: [
      /\b(confirmar|confirmacao|confirmo)\b/i,
      /\b(sim|ok|tudo bem|pode ser)\b.*\b(consulta|agendamento)\b/i,
    ],
    keywords: ["confirmar", "confirmacao", "sim", "ok"],
    confidence: 0.90,
  },
  {
    intent: "cancel_appointment",
    patterns: [
      /\b(cancelar|desmarcar)\b.*\b(consulta|agendamento)\b/i,
      /\b(nao).*(poder|consigo|vou conseguir)\b.*\b(consulta|ir)\b/i,
    ],
    keywords: ["cancelar", "desmarcar", "nao posso"],
    confidence: 0.85,
  },
  {
    intent: "reschedule_appointment",
    patterns: [
      /\b(remarcar|reagendar|mudar).*(consulta|horario|data)\b/i,
      /\b(outro|outra).*(horario|data|dia)\b/i,
    ],
    keywords: ["remarcar", "reagendar", "mudar", "outro horario"],
    confidence: 0.80,
  },
  {
    intent: "request_info",
    patterns: [
      /\b(informacao|info|saber|onde|como|quando|qual)\b/i,
      /\b(endereco|localizacao|telefone|contato)\b/i,
    ],
    keywords: ["informacao", "onde", "como", "endereco"],
    confidence: 0.70,
  },
  {
    intent: "request_human",
    patterns: [
      /\b(falar|atendente|pessoa|humano)\b/i,
      /\b(preciso|quero).*(falar|conversar).*(alguem|pessoa)\b/i,
    ],
    keywords: ["atendente", "pessoa", "humano", "falar"],
    confidence: 0.95,
  },
  {
    intent: "greeting",
    patterns: [
      /\b(oi|ola|bom dia|boa tarde|boa noite|hey|alo)\b/i,
    ],
    keywords: ["oi", "ola", "bom dia", "boa tarde"],
    confidence: 0.95,
  },
  {
    intent: "goodbye",
    patterns: [
      /\b(tchau|ate logo|ate|obrigado|valeu|bye)\b/i,
    ],
    keywords: ["tchau", "ate", "obrigado"],
    confidence: 0.90,
  },
];
```

## Mock Intent Detector

```typescript
// infrastructure/mock-intent-detector.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { IIntentDetector, IntentDetection, ConversationContext } from "../domain/intent-detector.interface";
import { INTENT_PATTERNS, IntentPattern } from "./intent-patterns";

@Injectable()
export class MockIntentDetector implements IIntentDetector {
  private readonly logger = new Logger(MockIntentDetector.name);

  async detectIntent(
    message: string,
    context?: ConversationContext,
  ): Promise<IntentDetection> {
    const normalized = this.normalizeMessage(message);

    let bestMatch: IntentDetection = {
      intent: "unknown",
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

    this.logger.log(`[MOCK] Intent: ${bestMatch.intent} (${bestMatch.confidence.toFixed(2)})`);
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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  private calculateConfidence(message: string, pattern: IntentPattern): number {
    let score = 0;
    let matches = 0;

    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        matches++;
        score += pattern.confidence;
      }
    }

    const keywordMatches = pattern.keywords.filter(keyword =>
      message.includes(keyword.toLowerCase()),
    );

    if (keywordMatches.length > 0) {
      matches++;
      score += pattern.confidence * 0.5;
    }

    if (matches === 0) return 0;
    return Math.min(score / matches, 1.0);
  }
}
```

## Mock Response Generator

```typescript
// infrastructure/mock-response-generator.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { IResponseGenerator, ResponseOptions } from "../domain/response-generator.interface";

@Injectable()
export class MockResponseGenerator implements IResponseGenerator {
  private readonly logger = new Logger(MockResponseGenerator.name);

  private readonly responses: Record<string, string[]> = {
    greeting: [
      "Ola! Como posso ajudar voce hoje?",
      "Oi! Bem-vindo a nossa clinica. Em que posso ajudar?",
    ],
    schedule_appointment: [
      "Otimo! Vou te ajudar a agendar uma consulta. Qual dia e horario voce prefere?",
      "Perfeito! Para qual dia voce gostaria de agendar?",
    ],
    confirm_appointment: [
      "Consulta confirmada com sucesso!",
      "Perfeito! Sua consulta esta confirmada.",
    ],
    cancel_appointment: [
      "Entendi. Vou cancelar sua consulta. Confirma?",
      "Sem problemas! Quer cancelar a consulta?",
    ],
    reschedule_appointment: [
      "Vou te ajudar a remarcar. Qual o novo dia e horario?",
      "Sem problemas! Para quando voce gostaria de reagendar?",
    ],
    request_info: [
      "Sobre o que voce gostaria de saber?",
      "Claro! Qual informacao voce precisa?",
    ],
    request_human: [
      "Vou transferir voce para um atendente. Um momento, por favor!",
      "Claro! Vou conectar voce com nossa equipe.",
    ],
    goodbye: [
      "Ate logo! Se precisar, estou aqui.",
      "Tchau! Qualquer coisa e so chamar.",
    ],
    unknown: [
      "Desculpe, nao entendi. Pode reformular?",
      "Nao compreendi. Pode explicar de outra forma?",
    ],
  };

  async generateResponse(options: ResponseOptions): Promise<string> {
    const responses = this.responses[options.intent] || this.responses.unknown;
    const response = responses[Math.floor(Math.random() * responses.length)];

    let finalResponse = response;
    if (options.entities) {
      finalResponse = this.injectEntities(response, options.entities);
    }

    this.logger.log(`[MOCK] Response for intent: ${options.intent}`);
    return finalResponse;
  }

  async generateConfirmation(
    action: string,
    details: Record<string, any>,
  ): Promise<string> {
    switch (action) {
      case "appointment_scheduled":
        return `Consulta agendada para ${details.date} as ${details.time} com ${details.doctor}!`;
      case "appointment_cancelled":
        return `Consulta do dia ${details.date} cancelada com sucesso.`;
      case "appointment_rescheduled":
        return `Consulta reagendada para ${details.newDate} as ${details.newTime}!`;
      default:
        return "Acao realizada com sucesso!";
    }
  }

  async generateErrorMessage(error: string): Promise<string> {
    const errorMessages: Record<string, string> = {
      slot_not_available: "Desculpe, este horario nao esta disponivel. Temos outras opcoes?",
      invalid_date: "Esta data nao e valida. Pode escolher outra?",
      past_date: "Nao e possivel agendar para datas passadas. Escolha uma data futura.",
      appointment_not_found: "Nao encontrei nenhuma consulta agendada.",
      generic: "Ops! Algo deu errado. Pode tentar novamente?",
    };

    return errorMessages[error] || errorMessages.generic;
  }

  private injectEntities(template: string, entities: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(entities)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), String(value));
    }
    return result;
  }
}
```

## Module Configuration

```typescript
// carol.module.ts

import { Module } from "@nestjs/common";
import { MockIntentDetector } from "./infrastructure/mock-intent-detector.service";
import { MockResponseGenerator } from "./infrastructure/mock-response-generator.service";

@Module({
  providers: [
    {
      provide: "IIntentDetector",
      useClass: MockIntentDetector,
    },
    {
      provide: "IResponseGenerator",
      useClass: MockResponseGenerator,
    },
  ],
  exports: ["IIntentDetector", "IResponseGenerator"],
})
export class CarolModule {}
```

**Nota:** Adicionar `CarolModule` nos imports do `AppModule`.

## Testes

### Testes do Intent Detector

```typescript
describe("MockIntentDetector", () => {
  let detector: MockIntentDetector;

  beforeEach(() => {
    detector = new MockIntentDetector();
  });

  it("should detect schedule_appointment intent", async () => {
    const result = await detector.detectIntent("Quero marcar uma consulta");
    expect(result.intent).toBe("schedule_appointment");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("should detect greeting intent", async () => {
    const result = await detector.detectIntent("Oi, tudo bem?");
    expect(result.intent).toBe("greeting");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("should extract date entity", async () => {
    const result = await detector.detectIntent("Quero marcar para amanha");
    expect(result.entities?.date).toBe("amanha");
  });

  it("should return unknown for unrecognized message", async () => {
    const result = await detector.detectIntent("xpto abc 123");
    expect(result.intent).toBe("unknown");
    expect(result.confidence).toBe(0);
  });
});
```

### Testes do Response Generator

```typescript
describe("MockResponseGenerator", () => {
  let generator: MockResponseGenerator;

  beforeEach(() => {
    generator = new MockResponseGenerator();
  });

  it("should generate response for intent", async () => {
    const response = await generator.generateResponse({ intent: "greeting" });
    expect(response.length).toBeGreaterThan(0);
  });

  it("should generate confirmation message", async () => {
    const response = await generator.generateConfirmation("appointment_scheduled", {
      date: "15/02",
      time: "14h",
      doctor: "Dr. Joao",
    });
    expect(response).toContain("15/02");
    expect(response).toContain("14h");
    expect(response).toContain("Dr. Joao");
  });

  it("should generate error message", async () => {
    const response = await generator.generateErrorMessage("slot_not_available");
    expect(response).toContain("disponivel");
  });
});
```

## Checklist de Implementacao

- [x] Criar interfaces (IIntentDetector, IResponseGenerator) ✅
- [x] Definir intent patterns ✅
- [x] Implementar MockIntentDetector ✅
- [x] Implementar MockResponseGenerator ✅
- [x] Configurar CarolModule ✅
- [x] Registrar CarolModule no AppModule ✅
- [x] Criar testes unitarios ✅ (41/41 testes passando)
- [ ] Integrar com Conversation Aggregate (Fase 4) - Próximo passo
- [ ] Validar deteccao de intencoes com mensagens reais - Próximo passo

## Resultado Esperado

1. ✅ Deteccao de intencoes funcionando com regex/keywords
2. ✅ Geracao de respostas pre-definidas
3. ✅ Extracao basica de entidades (data, hora)
4. ✅ Suporte para 8+ intencoes principais (schedule, confirm, cancel, reschedule, request_info, request_human, greeting, goodbye)
5. ✅ Testes passando (41/41 - 100%)
6. ✅ Interface pronta para substituir por IA real (Fase 9)
