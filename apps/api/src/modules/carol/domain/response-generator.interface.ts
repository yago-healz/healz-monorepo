import { ConversationContext } from "./intent-detector.interface";

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
