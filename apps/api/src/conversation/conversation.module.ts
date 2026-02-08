import { Module } from "@nestjs/common";
import { ConversationController } from "./api/conversation.controller";
import { ReceiveMessageHandler } from "./application/commands/receive-message.handler";
import { ConversationProjectionHandler } from "./application/event-handlers/conversation-projection.handler";
import { CarolModule } from "../carol/carol.module";

@Module({
  imports: [CarolModule],
  controllers: [ConversationController],
  providers: [ReceiveMessageHandler, ConversationProjectionHandler],
  exports: [ReceiveMessageHandler],
})
export class ConversationModule {}
