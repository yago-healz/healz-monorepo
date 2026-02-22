import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventStoreService } from "./event-store/event-store.service";
import { RabbitMQEventBus } from "./event-bus/rabbitmq-event-bus.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    EventStoreService,
    {
      provide: "IEventStore",
      useExisting: EventStoreService,
    },
    RabbitMQEventBus,
    {
      provide: "IEventBus",
      useExisting: RabbitMQEventBus,
    },
  ],
  exports: ["IEventStore", "IEventBus", EventStoreService, RabbitMQEventBus],
})
export class EventSourcingModule {}
