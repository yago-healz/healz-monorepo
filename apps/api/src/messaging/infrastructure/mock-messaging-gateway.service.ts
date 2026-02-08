// infrastructure/mock-messaging-gateway.service.ts

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  IMessagingGateway,
  OutgoingMessage,
  MessageDeliveryStatus,
} from "../domain/messaging-gateway.interface";

@Injectable()
export class MockMessagingGateway implements IMessagingGateway {
  private readonly logger = new Logger(MockMessagingGateway.name);
  private sentMessages: Map<string, MessageDeliveryStatus> = new Map();

  async sendMessage(message: OutgoingMessage): Promise<MessageDeliveryStatus> {
    const messageId = randomUUID();

    this.logger.log(
      `[MOCK] Sending message to ${message.to}: ${message.content.substring(0, 50)}...`,
    );

    // Simula delay de rede
    await this.simulateDelay(100, 500);

    // Simula falha aleatoria (5%)
    const shouldFail = Math.random() < 0.05;

    const status: MessageDeliveryStatus = {
      messageId,
      status: shouldFail ? "failed" : "sent",
      timestamp: new Date(),
      error: shouldFail ? "Network timeout (simulated)" : undefined,
    };

    this.sentMessages.set(messageId, status);

    if (!shouldFail) {
      this.simulateStatusProgression(messageId);
    }

    return status;
  }

  async sendMessages(
    messages: OutgoingMessage[],
  ): Promise<MessageDeliveryStatus[]> {
    const results: MessageDeliveryStatus[] = [];
    for (const message of messages) {
      const result = await this.sendMessage(message);
      results.push(result);
    }
    return results;
  }

  async getDeliveryStatus(messageId: string): Promise<MessageDeliveryStatus> {
    const status = this.sentMessages.get(messageId);
    if (!status) {
      throw new NotFoundException(`Message not found: ${messageId}`);
    }
    return status;
  }

  async checkPhoneNumber(phone: string): Promise<boolean> {
    this.logger.log(`[MOCK] Checking phone: ${phone} - Valid`);
    return true;
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private simulateStatusProgression(messageId: string): void {
    setTimeout(() => {
      const status = this.sentMessages.get(messageId);
      if (status) {
        status.status = "delivered";
        status.timestamp = new Date();
      }
    }, 2000);

    setTimeout(() => {
      if (Math.random() < 0.7) {
        const status = this.sentMessages.get(messageId);
        if (status) {
          status.status = "read";
          status.timestamp = new Date();
        }
      }
    }, 5000);
  }

  // Helpers para testes
  clearHistory(): void {
    this.sentMessages.clear();
  }

  getHistory(): MessageDeliveryStatus[] {
    return Array.from(this.sentMessages.values());
  }
}
