import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../db";
import {
  conversationView,
  messageView,
} from "../../db/schema/conversation-view.schema";
import { ReceiveMessageHandler } from "../application/commands/receive-message.handler";
import { ReceiveMessageDto } from "./dtos/receive-message.dto";

@Controller("conversations")
export class ConversationController {
  constructor(
    private readonly receiveMessageHandler: ReceiveMessageHandler,
  ) {}

  @Post("receive")
  async receiveMessage(@Body() dto: ReceiveMessageDto) {
    await this.receiveMessageHandler.execute({
      conversationId: dto.conversationId || randomUUID(),
      patientId: dto.patientId,
      clinicId: dto.clinicId,
      tenantId: dto.tenantId,
      fromPhone: dto.fromPhone,
      content: dto.content,
      messageType: dto.messageType,
    });
    return { success: true };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const [result] = await db
      .select()
      .from(conversationView)
      .where(eq(conversationView.id, id));

    if (!result) throw new NotFoundException("Conversation not found");
    return result;
  }

  @Get(":id/messages")
  async getMessages(@Param("id") id: string) {
    const messages = await db
      .select()
      .from(messageView)
      .where(eq(messageView.conversationId, id))
      .orderBy(desc(messageView.createdAt));

    return messages;
  }

  @Get()
  async findAll(@Query("patientId") patientId?: string) {
    const conditions = [];
    if (patientId) conditions.push(eq(conversationView.patientId, patientId));

    const conversations = await db
      .select()
      .from(conversationView)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(conversationView.updatedAt));

    return conversations;
  }
}
