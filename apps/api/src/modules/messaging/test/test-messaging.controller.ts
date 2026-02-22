// test/test-messaging.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  IMessagingGateway,
  IncomingMessage,
} from "../domain/messaging-gateway.interface";
import { MockMessagingGateway } from "../infrastructure/mock-messaging-gateway.service";
import {
  SimulateMessageDto,
  SendTestMessageDto,
} from "./dtos/simulate-message.dto";

@Controller("test/messaging")
export class TestMessagingController {
  constructor(
    @Inject("IMessagingGateway")
    private readonly messagingGateway: IMessagingGateway,
  ) {}

  @Post("simulate-message")
  async simulateIncomingMessage(@Body() dto: SimulateMessageDto) {
    const incomingMessage: IncomingMessage = {
      from: dto.from,
      content: dto.content,
      timestamp: new Date(),
      messageId: randomUUID(),
      type: dto.type || "text",
      metadata: dto.metadata,
    };

    // TODO: Quando Conversation Aggregate estiver pronto (Fase 4),
    // publicar evento MessageReceived via eventBus

    return {
      success: true,
      message: "Message simulated successfully",
      data: incomingMessage,
    };
  }

  @Post("send-test-message")
  async sendTestMessage(@Body() dto: SendTestMessageDto) {
    const result = await this.messagingGateway.sendMessage({
      to: dto.to,
      content: dto.content,
      type: dto.type,
    });

    return {
      success: true,
      delivery_status: result,
    };
  }

  @Get("history")
  async getHistory() {
    if (this.messagingGateway instanceof MockMessagingGateway) {
      return { messages: this.messagingGateway.getHistory() };
    }
    throw new BadRequestException("History only available in mock mode");
  }

  @Delete("history")
  async clearHistory() {
    if (this.messagingGateway instanceof MockMessagingGateway) {
      this.messagingGateway.clearHistory();
      return { success: true, message: "History cleared" };
    }
    throw new BadRequestException("Clear only available in mock mode");
  }
}
