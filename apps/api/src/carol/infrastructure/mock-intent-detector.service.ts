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
