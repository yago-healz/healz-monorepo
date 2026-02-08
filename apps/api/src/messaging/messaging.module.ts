// messaging.module.ts

import { Module } from "@nestjs/common";
import { MockMessagingGateway } from "./infrastructure/mock-messaging-gateway.service";
import { TestMessagingController } from "./test/test-messaging.controller";

@Module({
  controllers: [TestMessagingController],
  providers: [
    {
      provide: "IMessagingGateway",
      useClass: MockMessagingGateway,
    },
  ],
  exports: ["IMessagingGateway"],
})
export class MessagingModule {}
