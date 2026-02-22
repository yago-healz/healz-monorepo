// domain/messaging-gateway.interface.ts

export interface OutgoingMessage {
  to: string; // Numero do destinatario (formato: +5511999999999)
  content: string; // Conteudo da mensagem
  type?: "text" | "image" | "document";
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface IncomingMessage {
  from: string;
  content: string;
  timestamp: Date;
  messageId: string;
  type?: "text" | "image" | "document";
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  error?: string;
}

export interface IMessagingGateway {
  sendMessage(message: OutgoingMessage): Promise<MessageDeliveryStatus>;
  sendMessages(messages: OutgoingMessage[]): Promise<MessageDeliveryStatus[]>;
  getDeliveryStatus(messageId: string): Promise<MessageDeliveryStatus>;
  checkPhoneNumber(phone: string): Promise<boolean>;
}
