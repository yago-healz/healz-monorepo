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
