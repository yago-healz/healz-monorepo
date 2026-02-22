import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqp-connection-manager";
import { ChannelWrapper } from "amqp-connection-manager";
import { Channel } from "amqplib";
import { DomainEvent } from "../domain/domain-event.interface";
import { IEventHandler } from "../domain/event-handler.interface";
import { IEventBus } from "./event-bus.interface";

@Injectable()
export class RabbitMQEventBus
  implements IEventBus, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMQEventBus.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private handlers: Map<string, IEventHandler[]> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url =
      this.configService.get<string>("RABBITMQ_URL") || "amqp://localhost";

    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: 60,
    });

    this.connection.on("connect", () => {
      this.logger.log("Connected to RabbitMQ");
    });

    this.connection.on("disconnect", (err) => {
      this.logger.warn("Disconnected from RabbitMQ", err?.err?.message);
    });

    this.channelWrapper = this.connection.createChannel({
      json: false,  // Disable auto JSON serialization - we handle it manually
      setup: async (channel: Channel) => {
        // Exchange principal para eventos
        await channel.assertExchange("healz.events", "topic", {
          durable: true,
        });

        // Dead Letter Exchange para eventos com falha
        await channel.assertExchange("healz.events.dlx", "topic", {
          durable: true,
        });

        // Queue principal
        const queueName = "healz.events.consumer";
        await channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": "healz.events.dlx",
            "x-dead-letter-routing-key": "failed",
          },
        });

        // Bind: recebe todos os eventos
        await channel.bindQueue(queueName, "healz.events", "#");

        // Dead Letter Queue
        await channel.assertQueue("healz.events.failed", { durable: true });
        await channel.bindQueue(
          "healz.events.failed",
          "healz.events.dlx",
          "failed",
        );

        // Consumer
        await channel.consume(queueName, async (msg) => {
          if (!msg) return;

          try {
            // Parse the event from the Buffer
            const eventStr = msg.content.toString('utf-8');
            const event: DomainEvent = JSON.parse(eventStr);
            await this.handleEvent(event);
            channel.ack(msg);
          } catch (error) {
            this.logger.error(
              `Error handling event: ${error.message}`,
              error.stack,
            );
            channel.nack(msg, false, false); // Envia para DLQ
          }
        });
      },
    });
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.channelWrapper.waitForConnect();

    const content = Buffer.from(JSON.stringify(event));

    /**
     * Type assertion needed due to incompatibility between @types/amqplib@0.10.8
     * and amqp-connection-manager@5.0.0 PublishOptions interface.
     * The persistent property exists in amqplib's Options.Publish but TypeScript
     * fails to recognize it through the inheritance chain.
     */
    const published = await this.channelWrapper.publish(
      "healz.events",
      event.event_type,
      content,
      {
        persistent: true,
        contentType: "application/json",
        timestamp: Date.now(),
        headers: {
          eventId: event.event_id,
          eventType: event.event_type,
        },
      } as any,
    );

    if (!published) {
      this.logger.error(
        `Failed to publish event ${event.event_type} to exchange healz.events`,
      );
      throw new Error(
        `Failed to publish event ${event.event_type} to RabbitMQ`,
      );
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(eventType: string, handler: IEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.event_type) || [];

    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        this.logger.error(
          `Handler error for ${event.event_type}: ${error.message}`,
          error.stack,
        );
        throw error; // Re-throw para triggerar retry/DLQ
      }
    }
  }

  async onModuleDestroy() {
    if (this.channelWrapper) await this.channelWrapper.close();
    if (this.connection) await this.connection.close();
  }
}
